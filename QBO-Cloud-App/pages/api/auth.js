// Initiates the QuickBooks Online OAuth 2.0 Flow
import OAuthClient from 'intuit-oauth';

export default async function handler(req, res) {
  try {
    const oauthClient = new OAuthClient({
      clientId: process.env.QBO_CLIENT_ID,
      clientSecret: process.env.QBO_CLIENT_SECRET,
      environment: 'production',
      redirectUri: process.env.QBO_REDIRECT_URI,
    });

    // The scopes to request (Accounting allows reading financial reports)
    const authUri = oauthClient.authorizeUri({
      scope: [OAuthClient.scopes.Accounting],
      state: 'knockout-ai-login',
    });

    // Redirect the user to Intuit for login
    res.redirect(authUri);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to initiate QBO Login' });
  }
}
