class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
};

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';
  res.status(statusCode).json({ success: false, message });
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
