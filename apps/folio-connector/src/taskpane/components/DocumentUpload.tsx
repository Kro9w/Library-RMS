/* global Word, Office, console */
import * as React from "react";
import { useState } from "react";
import {
  Button,
  makeStyles,
  Spinner,
  Body1,
  Card,
  CardFooter,
  CardHeader,
} from "@fluentui/react-components";
import { trpc, setAccessToken } from "../../trpc";
import * as Icons from "@fluentui/react-icons";

const CheckmarkIcon = Icons.CheckmarkCircle24Filled as any;
const ErrorIcon = Icons.ErrorCircle24Filled as any;

const useStyles = makeStyles({
  root: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    textAlign: "center",
    padding: "16px",
  },
  iconSuccess: {
    color: "#28a745",
    fontSize: "48px",
  },
  iconError: {
    color: "#d13438",
    fontSize: "48px",
  },
});

type Status = "idle" | "authenticating" | "scanning" | "uploading" | "success" | "error";

const DocumentUpload: React.FC = () => {
  const styles = useStyles();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  let dialog: Office.Dialog;

  const getDocumentAsBase64 = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      Office.context.document.getFileAsync(
        Office.FileType.Compressed,
        { sliceSize: 65536 },
        (result) => {
          if (result.status === Office.AsyncResultStatus.Failed) {
            reject(new Error(`Failed to get document file: ${result.error.message}`));
          } else {
            const file = result.value;
            const reader = new FileReader();
            const chunks: Blob[] = [];

            const processSlices = (sliceIndex = 0): void => {
              if (sliceIndex >= file.sliceCount) {
                file.closeAsync();
                const blob = new Blob(chunks);
                reader.readAsDataURL(blob);
                return;
              }

              file.getSliceAsync(sliceIndex, (sliceResult) => {
                if (sliceResult.status === Office.AsyncResultStatus.Succeeded) {
                  chunks.push(new Blob([sliceResult.value.data]));
                  processSlices(sliceIndex + 1);
                } else {
                  file.closeAsync();
                  reject(new Error(`Failed to read document slice: ${sliceResult.error.message}`));
                }
              });
            };

            reader.onload = (event) => {
              const base64 = (event.target?.result as string).split(",")[1];
              resolve(base64);
            };

            reader.onerror = (error) => {
              reject(new Error(`FileReader error: ${error.type}`));
            };

            processSlices();
          }
        }
      );
    });
  };

  const getFileName = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      Office.context.document.getFilePropertiesAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          reject(new Error(`Failed to get file properties: ${result.error.message}`));
        } else {
          const url = result.value.url;
          if (url) {
            const fileName = url.substring(url.lastIndexOf("/") + 1).replace(".docx", "");
            resolve(fileName);
          } else {
            resolve("Document"); // Default if URL is empty
          }
        }
      });
    });
  };

  const scanForControlNumber = async (): Promise<string> => {
    return Word.run(async (context) => {
      // 1. Get the entire body text
      const body = context.document.body;
      body.load("text");
      await context.sync();
      const bodyText = body.text;

      // 2. Use a flexible regex to find the control number
      // - "CONTROL NO\."     : Matches the literal text "CONTROL NO."
      // - [\s\S]*?           : Matches any character (including newlines) in a non-greedy way
      // - ([a-zA-Z0-9-]+)    : Captures the control number (alphanumeric and hyphens)
      // - \s*-FL             : Matches the terminator "-FL", preceded by optional whitespace
      const regex = /CONTROL NO\.([\s\S]*?)([a-zA-Z0-9-]+)\s*-FL/;
      const match = bodyText.match(regex);

      // 3. Extract the control number if a match is found
      if (match && match[2]) {
        // The second captured group is our control number
        return match[2].trim();
      }

      return ""; // Return empty string if no match is found
    });
  };

  const handleSendToFolio = async () => {
    setStatus("scanning");
    setErrorMessage("");

    try {
      // 1. Scan the document first
      const fileName = await getFileName();
      const controlNumber = await scanForControlNumber();

      // 2. Open the dialog, passing the scanned data in the URL
      const url = new URL("https://localhost:5173/word-auth");
      url.searchParams.append("fileName", fileName);
      url.searchParams.append("controlNumber", controlNumber);

      setStatus("authenticating");
      Office.context.ui.displayDialogAsync(url.toString(), { height: 60, width: 50 }, (result) => {
        if (result.status === Office.AsyncResultStatus.Failed) {
          setStatus("error");
          setErrorMessage(`Could not open auth window: ${result.error.message}`);
          return;
        }

        dialog = result.value;
        dialog.addEventHandler(Office.EventType.DialogMessageReceived, async (arg: any) => {
          dialog.close();

          const message = JSON.parse(arg.message);

          if (message.status === "error") {
            setStatus("error");
            setErrorMessage(message.error);
            return;
          }

          // 3. Set the token received from the dialog
          setAccessToken(message.token);

          // 4. Get the document content and upload with the final data from the dialog
          try {
            setStatus("uploading");
            const file = await getDocumentAsBase64();

            await trpc.wordDocument.upload.mutate({
              file,
              fileName: message.data.fileName,
              controlNumber: message.data.controlNumber,
            });

            setStatus("success");
          } catch (error: any) {
            console.error("Error during document processing:", error);
            setStatus("error");
            setErrorMessage(error.message || "An unknown error occurred.");
          }
        });
      });
    } catch (error: any) {
      console.error("Error scanning document:", error);
      setStatus("error");
      setErrorMessage(error.message || "Failed to scan document.");
    }
  };

  const renderStatus = () => {
    switch (status) {
      case "authenticating":
        return <Body1>Waiting for authentication...</Body1>;
      case "scanning":
        return <Body1>Reading document details...</Body1>;
      case "uploading":
        return <Body1>Uploading to Folio...</Body1>;
      case "success":
        return null;
      case "error":
        return null;
      default:
        return <Body1>Send this document to your Folio account.</Body1>;
    }
  };

  const isLoading = status === "authenticating" || status === "scanning" || status === "uploading";

  return (
    <div className={styles.root}>
      {isLoading && <Spinner />}
      {renderStatus()}

      {status === "success" && (
        <Card className={styles.card}>
          <CardHeader>
            <CheckmarkIcon className={styles.iconSuccess} />
          </CardHeader>
          <Body1>Document sent to Folio successfully!</Body1>
        </Card>
      )}

      {status === "error" && (
        <Card className={styles.card}>
          <CardHeader>
            <ErrorIcon className={styles.iconError} />
          </CardHeader>
          <Body1>Something went wrong</Body1>
          <CardFooter>
            <Body1>{errorMessage}</Body1>
          </CardFooter>
        </Card>
      )}

      <Button appearance="primary" onClick={handleSendToFolio} disabled={isLoading}>
        {status === "success" || status === "error" ? "Send Another Document" : "Send to Folio"}
      </Button>
    </div>
  );
};

export default DocumentUpload;
