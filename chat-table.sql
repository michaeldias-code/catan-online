-- Tabela para mensagens do chat no Catan
-- Execute este SQL no painel do Supabase

CREATE TABLE chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL,
  player_id INTEGER NOT NULL,
  player_name TEXT NOT NULL,
  message TEXT NOT NULL,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhorar performance das consultas
CREATE INDEX idx_chat_messages_room_code_created_at ON chat_messages(room_code, created_at);

-- Políticas RLS (Row Level Security) para segurança
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de mensagens
CREATE POLICY "Allow insert chat messages" ON chat_messages
  FOR INSERT WITH CHECK (true);

-- Política para permitir leitura de mensagens da mesma sala
CREATE POLICY "Allow read chat messages in room" ON chat_messages
  FOR SELECT USING (true);

-- Política para permitir atualização (se necessário)
CREATE POLICY "Allow update own messages" ON chat_messages
  FOR UPDATE USING (session_id = current_setting('app.session_id', true));

-- Política para permitir exclusão (se necessário)
CREATE POLICY "Allow delete own messages" ON chat_messages
  FOR DELETE USING (session_id = current_setting('app.session_id', true));
