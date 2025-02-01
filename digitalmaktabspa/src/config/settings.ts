const settings = {
  dev: {
    apiUrl: "http://192.168.8.142:5000/api",
    url: "http://localhost:5000/",
    signalRUrl: "http://192.168.8.142:5000/",
  },
  staging: {
    apiUrl: "http://localhost:5000/api",
    url: "http://192.168.8.142:5000/",
    signalRUrl: "http://localhost:5000/",
  },
  prod: {
    apiUrl: "https://www.digitalmaktab.com/api", // Replace 192.168.8.142 with your actual external IP or domain
    url: "https://www.digitalmaktab.com/", // Replace 192.168.8.142 with your actual external IP or domain
    signalRUrl: "https://www.digitalmaktab.com/",
  },
};

// Export the correct settings based on NODE_ENV
const currentEnv = process.env.NODE_ENV === "production" ? "prod" : "dev";

export default settings[currentEnv];
