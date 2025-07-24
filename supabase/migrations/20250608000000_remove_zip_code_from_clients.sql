-- Migration para remover o campo zip_code da tabela clients
ALTER TABLE clients DROP COLUMN IF EXISTS zip_code;
