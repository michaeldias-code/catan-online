import { createClient } from '@supabase/supabase-js'

// Carrega as variáveis e remove espaços extras ou caracteres de quebra de linha (CR) invisíveis
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  // Apenas avisa no console em vez de quebrar o app
  if (typeof window !== 'undefined') {
    console.warn('AVISO: Credenciais do Supabase não encontradas no .env.local')
    console.log('Isso é normal se você estiver apenas testando a interface.')
  }
}

// Inicializa o cliente mesmo sem as chaves para evitar erros de importação em outros arquivos
// Se as chaves estiverem vazias, as chamadas ao banco apenas falharão, mas o app carregará.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)
