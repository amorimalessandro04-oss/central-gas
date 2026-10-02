// Middleware central de tratamento de erros.
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500
    ? err.status
    : 500;
  if (status >= 500) console.error('Erro interno:', err);

  res.status(status).json({
    erro: status >= 500 ? 'Erro interno do servidor' : (err.message || 'Requisição inválida'),
  });
}

module.exports = errorHandler;
