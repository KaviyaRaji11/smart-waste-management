import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("swm_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the saved token is rejected (expired, or signed with an old secret / old
// database), wipe the stale session and send the user to the login page
// instead of letting every request fail with 401.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/register");

    if (status === 401 && !isAuthCall && localStorage.getItem("swm_token")) {
      localStorage.removeItem("swm_token");
      localStorage.removeItem("swm_user");
      window.dispatchEvent(new Event("swm:session-expired"));
      if (!["/login", "/register", "/"].includes(window.location.pathname)) {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

export default api;
