/**
 * Utility for sending successful JSON responses in ONE consistent shape:
 *
 *   { "success": true, "message": "...", "data": { ... } }
 *
 * Controllers use this so every endpoint answers with the same structure.
 */
class ApiResponse {
  /**
   * @param {import('express').Response} res
   * @param {object} options
   * @param {number} [options.statusCode=200] - 200 for reads, 201 for creations.
   * @param {string} [options.message='Success']
   * @param {*} [options.data=null]
   */
  static success(res, { statusCode = 200, message = 'Success', data = null }) {
    return res.status(statusCode).json({ success: true, message, data });
  }
}

module.exports = ApiResponse;
