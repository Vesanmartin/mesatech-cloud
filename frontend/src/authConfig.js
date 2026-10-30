export const msalConfig = {
  auth: {
    clientId: "9fd2e6cb-ff60-4e0c-b508-e37a86ac6d4f",
    authority: "https://login.microsoftonline.com/36218c1c-0f05-4845-9f7e-b6f4f6a9ccde",
    redirectUri: "http://localhost:3000"
  },
  cache: {
    cacheLocation: "sessionStorage"
  }
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"]
};

export const apiRequest = {
  scopes: ["api://9fd2e6cb-ff60-4e0c-b508-e37a86ac6d4f/access_as_user"]
};