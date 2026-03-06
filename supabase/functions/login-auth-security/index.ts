import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Configurações e chaves (Service Role é necessária para gerenciar o login e os bans)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRoleKey = Deno.env.get("PRIVATE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
    // CORS Headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { email, password } = await req.json();
        const ip = req.headers.get("x-forwarded-for") || "0.0.0.0";

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false },
        });

        // 1. Localizar o usuário pelo email na tabela colaboradores ou clientes para pegar o user_id
        // Nota: Estamos assumindo que o login_tentativas é gerenciado por user_id do auth.users
        let userId: string | null = null;

        // Tentar colaborador
        const { data: colab } = await supabaseAdmin
            .from("colaboradores")
            .select("user_id")
            .eq("email", email)
            .maybeSingle();

        if (colab) {
            userId = colab.user_id;
        } else {
            // Tentar cliente
            const { data: cliente } = await supabaseAdmin
                .from("clientes")
                .select("auth_user_id")
                .eq("email", email)
                .maybeSingle();

            if (cliente) userId = cliente.auth_user_id;
        }

        if (!userId) {
            // Para evitar enumeração de usuários, retornamos erro genérico se o email não existir
            return new Response(JSON.stringify({ error: "Email ou senha inválidos" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Consultar tentativas de login
        const { data: tentativaRecord } = await supabaseAdmin
            .from("login_tentativas")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle();

        const agora = new Date();

        // 3. Verificar bloqueio
        if (tentativaRecord?.bloqueado_ate) {
            const bloqueadoAte = new Date(tentativaRecord.bloqueado_ate);
            if (bloqueadoAte > agora) {
                const minutosRestantes = Math.ceil((bloqueadoAte.getTime() - agora.getTime()) / 60000);
                return new Response(JSON.stringify({ error: `Novas tentativas devem aguardar ${minutosRestantes} minuto(s).` }), {
                    status: 403,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        // 4. Tentar autenticação
        const { data: authData, error: authError } = await createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!)
            .auth.signInWithPassword({ email, password });

        if (authError) {
            // Falha no login - Atualizar tentativas
            const novasTentativas = (tentativaRecord?.tentativas || 0) + 1;
            let bloqueado_ate: Date | null = null;

            if (novasTentativas >= 11) {
                // Banir usuário definitivamente via Admin API
                await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'infinite' });
                bloqueado_ate = new Date(agora.getTime() + 100 * 365 * 24 * 60 * 60 * 1000); // 100 anos
            } else if (novasTentativas >= 10) {
                bloqueado_ate = new Date(agora.getTime() + 60 * 60 * 1000); // 1 hora
            } else if (novasTentativas >= 6) {
                bloqueado_ate = new Date(agora.getTime() + 10 * 60 * 1000); // 10 minutos
            }

            // Atualizar tabela de controle
            await supabaseAdmin.from("login_tentativas").upsert({
                user_id: userId,
                tentativas: novasTentativas,
                bloqueado_ate: bloqueado_ate?.toISOString(),
                ultima_tentativa: agora.toISOString(),
                ip: ip
            });

            return new Response(JSON.stringify({ error: "Email ou senha inválidos" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 5. Login Bem-sucedido - Resetar tentativas
        await supabaseAdmin.from("login_tentativas").upsert({
            user_id: userId,
            tentativas: 0,
            bloqueado_ate: null,
            ultima_tentativa: agora.toISOString(),
            ip: ip
        });

        return new Response(JSON.stringify(authData), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
