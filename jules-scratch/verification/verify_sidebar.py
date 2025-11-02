from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Verify JoinOrganization Page
    page.goto("http://localhost:5173/join")
    page.screenshot(path="jules-scratch/verification/join-organization-no-sidebar.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
