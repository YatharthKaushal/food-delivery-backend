import express from "express";

const router = express.Router();

router.get("/delete-account", (req, res) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Delete Account - Tiffsy</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
          color: #333;
          margin-bottom: 10px;
          font-size: 28px;
        }
        .subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 14px;
        }
        h2 {
          color: #444;
          margin-bottom: 20px;
          font-size: 18px;
        }
        .steps {
          list-style: none;
        }
        .step {
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 10px;
          border-left: 4px solid #667eea;
        }
        .step-number {
          background: #667eea;
          color: white;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          margin-right: 15px;
          flex-shrink: 0;
        }
        .step-text {
          color: #444;
          line-height: 1.5;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 15px;
          margin-top: 20px;
          color: #856404;
          font-size: 14px;
        }
        .warning strong {
          display: block;
          margin-bottom: 5px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Delete Your Account</h1>
        <p class="subtitle">Tiffsy Account Deletion Instructions</p>

        <h2>Follow these steps to delete your account:</h2>

        <ol class="steps">
          <li class="step">
            <span class="step-number">1</span>
            <span class="step-text">Open the <strong>Tiffsy App</strong> on your device</span>
          </li>
          <li class="step">
            <span class="step-number">2</span>
            <span class="step-text">Go to <strong>Profile</strong> section</span>
          </li>
          <li class="step">
            <span class="step-number">3</span>
            <span class="step-text">Scroll down to find the <strong>"Delete Account"</strong> option</span>
          </li>
          <li class="step">
            <span class="step-number">4</span>
            <span class="step-text">Tap on <strong>"Delete Account"</strong> and confirm your decision</span>
          </li>
        </ol>

        <div class="warning">
          <strong>⚠️ Warning</strong>
          This action is permanent and cannot be undone. All your data, including order history and subscriptions, will be permanently deleted.
        </div>
      </div>
    </body>
    </html>
  `;

  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;
