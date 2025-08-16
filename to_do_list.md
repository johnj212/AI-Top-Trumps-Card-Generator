# To Do List

## Critical Security Vulnerabilities

*   **[DONE]** **[Severity: Critical]** Move Gemini API key and all API calls to a secure backend server. Do not expose the API key to the frontend. This is to prevent unauthorized use of the API key, which could result in significant costs and abuse of the service.

## Other Security Recommendations

*   **[Severity: Medium]** Sanitize user-provided input that is rendered to the DOM before using `html-to-image`. The `html-to-image` library can potentially be exploited with Cross-Site Scripting (XSS) if user-provided data is rendered without sanitization. Before generating an image, ensure any data from the user (or from the Gemini API) is properly sanitized to prevent malicious HTML from being rendered and executed.


* To use Tailwind CSS in production, install it as a PostCSS plugin
