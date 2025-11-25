const resolveBaseUrl = () => {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }

  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
};

export const getDefaultUrl = () => {
  const baseUrl = resolveBaseUrl();

  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return baseUrl;
  }

  return `https://${baseUrl}`;
};

