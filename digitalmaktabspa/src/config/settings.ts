const settings = {
  dev: {
    apiUrl: "http://192.168.8.142:5000/api",
  },
  staging: {
    apiUrl: "http://localhost:5000/api",
  },
  prod: {
    apiUrl: "http://localhost:5000/api",
  },
};

// Export the correct settings based on NODE_ENV
const currentEnv = process.env.NODE_ENV === "production" ? "prod" : "dev";

export default settings[currentEnv];
