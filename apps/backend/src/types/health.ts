export type HealthStatus = {
  status: 'ok';
};

export type HealthResponse = {
  success: true;
  data: HealthStatus;
};
