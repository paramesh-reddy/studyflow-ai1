export interface AppConfig {
  port: number;
  nodeEnv: string;
  databaseUrl: string | undefined;
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
  geminiApiKey: string | undefined;
  geminiChatModel: string;
  geminiEmbeddingModel: string;
  corsOrigin: string;
}

export function getEnvConfig(): AppConfig {
  return {
    port: Number(process.env.PORT || 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET || 'studyflow-dev-access-secret-change-in-prod',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'studyflow-dev-refresh-secret-change-in-prod',
    accessTokenExpiresIn: '2h',
    refreshTokenExpiresIn: '7d',
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiChatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-4-hydrogen',
    geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-2',
    corsOrigin: process.env.APP_URL || '*',
  };
}
