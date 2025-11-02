from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Verify SignUp Page
    page.goto("http://localhost:5173/signup")
    page.screenshot(path="jules-scratch/verification/signup-page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
