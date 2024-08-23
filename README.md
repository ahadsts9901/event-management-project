---

# Progziel Event Management Backend

## Overview

Celanderific Backend is a backend server project designed to provide various server-side functionalities. This project is built using Node.js with a focus on simplicity and performance.

## Project Details

- **Name:** Progziel Event Management Backend
- **Version:** 1.0.1
- **Type:** Module
- **Main File:** `server.mjs`

## Description

This backend server is built with Node.js and provides a range of functionalities including rate limiting, security features, and API documentation. It leverages popular libraries such as Express for routing and Swagger for API documentation.

## Features

- **Express**: A fast, unopinionated, minimalist web framework for Node.js.
- **Rate Limiting**: Using `express-rate-limit` to prevent abuse.
- **Security**: Enhanced security with `helmet`.
- **Environment Variables**: Managed via `dotenv`.
- **API Documentation**: Automatically generated using `swagger-jsdoc` and served with `swagger-ui-express`.

## Installation

To get started with this project, clone the repository and install the dependencies:

```bash
git clone https://github.com/developer-awais/progziel-event-management-backend.git
cd celanderific-backend
npm install
```

## Usage

To start the server, run:

```bash
npm run start
```

To view Swagger docs:
localhost:3000/api-docs

## Scripts
- `start`: Starts the backend server.

## Dependencies

- **cors**: Middleware for enabling Cross-Origin Resource Sharing.
- **dotenv**: Loads environment variables from a `.env` file.
- **express**: Web framework for Node.js.
- **express-rate-limit**: Rate limiting middleware for Express.
- **helmet**: Middleware for setting various HTTP headers for security.
- **swagger-jsdoc**: JSDoc for Swagger.
- **swagger-ui-express**: Swagger UI for Express.

## Configuration

Make sure to create a `.env` file in the root directory of the project to set up your environment variables. The `.env` file is not included in version control.

## Contributing

Contributions are welcome! Please open an issue or a pull request on GitHub.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions or feedback, reach out to awaisjiskani464@gmail.com

---
