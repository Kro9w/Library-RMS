export const FileDropzone = ({
  getRootProps,
  getInputProps,
  isDragActive,
  file,
  setFile,
  setControlNumber,
}: any) => {
  return (
    <div
      {...getRootProps()}
      className={`upload-dropzone ${isDragActive ? "active" : ""} ${file ? "has-file" : ""}`}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="upload-file-selected">
          <div className="upload-file-icon">
            <i
              className={`bi ${
                file.type.includes("pdf")
                  ? "bi-file-earmark-pdf"
                  : file.type.includes("word")
                    ? "bi-file-earmark-word"
                    : file.type.includes("image")
                      ? "bi-file-earmark-image"
                      : "bi-file-earmark"
              }`}
            />
          </div>
          <div className="upload-file-meta">
            <div className="upload-file-name">{file.name}</div>
            <div className="upload-file-size">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
          <button
            className="upload-file-remove"
            onClick={(e) => {
              e.stopPropagation();
              setFile(null);
              setControlNumber(null);
            }}
            type="button"
          >
            <i className="bi bi-x" />
          </button>
        </div>
      ) : (
        <div className="upload-dropzone-inner">
          <div className="upload-dropzone-icon">
            <i className="bi bi-cloud-arrow-up" />
          </div>
          <div className="upload-dropzone-text">
            {isDragActive ? (
              "Drop the file here"
            ) : (
              <>
                <strong>Click to upload</strong> or drag and drop
              </>
            )}
          </div>
          <div className="upload-dropzone-hint">PDF, DOCX, PNG, JPG, TIFF</div>
        </div>
      )}
    </div>
  );
};

export const TransitRouteBuilder = ({
  transitRoute,
  setTransitRoute,
  departmentsResponse,
}: any) => {
  return (
    <div className="upload-field transit-route-builder">
      <label className="form-label">Approval Route</label>
      <div className="transit-route-list">
        {transitRoute.map((deptId: string, index: number) => {
          return (
            <div
              key={index}
              className="transit-route-item d-flex align-items-center mb-2"
            >
              <span className="badge bg-secondary me-2">{index + 1}</span>
              <select
                className="form-select form-select-sm"
                value={deptId}
                onChange={(e) => {
                  const newRoute = [...transitRoute];
                  newRoute[index] = e.target.value;
                  setTransitRoute(newRoute);
                }}
              >
                <option value="" disabled>
                  Select Department
                </option>
                {departmentsResponse?.map((d: any) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-link text-danger p-0 ms-2"
                onClick={() => {
                  const newRoute = transitRoute.filter(
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (_: any, i: number) => i !== index,
                  );
                  setTransitRoute(newRoute);
                }}
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm mt-1"
          onClick={() => setTransitRoute([...transitRoute, ""])}
        >
          <i className="bi bi-plus me-1"></i> Add Stop
        </button>
      </div>
    </div>
  );
};
