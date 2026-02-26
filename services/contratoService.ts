import { supabase } from './supabaseClient';
import { UserRole } from './interfaces/types';
import { getCurrentUser } from './authService';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { getClienteById } from './clientesService';
import { getTipos } from './projetoTiposService';
import { getEtapasByProjeto } from './projetoEtapasService';
import { getParcelasProjeto } from './projetoParcelasService';
import { formatCurrency, formatDate } from '../utils/formatters';

const ensureAdmin = () => {
    const user = getCurrentUser();
    if (user?.role !== UserRole.ADMIN) {
        throw new Error('Acesso negado: Apenas administradores podem realizar esta ação.');
    }
};

/**
 * Busca os dados necessários e gera o contrato .docx
 */
export const gerarEUploadContrato = async (projetoId: string): Promise<string> => {
    ensureAdmin();

    // 1. Buscar dados do projeto
    const { data: projeto, error: projError } = await supabase
        .from('projetos')
        .select('*, cliente:clientes(*), tipo:projeto_tipos(*)')
        .eq('id', projetoId)
        .single();

    if (projError || !projeto) throw new Error('Projeto não encontrado.');

    if (!projeto.tipo?.contrato_template_path) {
        throw new Error('O tipo deste projeto não possui um template de contrato vinculado.');
    }

    // 2. Baixar template do Storage
    const { data: fileData, error: downloadError } = await supabase.storage
        .from('contratos-templates')
        .download(projeto.tipo.contrato_template_path);

    if (downloadError || !fileData) throw new Error(`Erro ao baixar template: ${downloadError?.message}`);

    // 3. Preparar dados para o template
    const cliente = projeto.cliente;
    const etapas = await getEtapasByProjeto(projetoId);
    const parcelas = await getParcelasProjeto(projetoId);

    const content = await fileData.arrayBuffer();
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
    });

    const dataHoje = new Date().toLocaleDateString('pt-BR');

    try {
        doc.render({
            cliente_nome: cliente?.nome || '',
            cliente_documento: cliente?.cpf_cnpj || '',
            cliente_email: cliente?.email || '',
            cliente_telefone: cliente?.telefone || '',
            empresa_nome: 'Nome da Empresa Exemplo',
            empresa_cnpj: '00.000.000/0001-00',
            projeto_nome: projeto.nome_projeto,
            projeto_endereco: projeto.endereco || '',
            tipo_projeto: projeto.tipo?.nome || '',
            valor_projeto: formatCurrency(projeto.valor || 0),
            valor_extenso: '',
            forma_pagamento: `${projeto.numero_prestacoes}x`,
            numero_parcelas: projeto.numero_prestacoes,
            data_hoje: dataHoje,
            lista_etapas: etapas.map(e => ({ nome: e.nomeEtapa })),
            lista_parcelas: parcelas.map(p => ({
                numero: p.numeroParcela,
                valor: formatCurrency(Number(p.valorParcela)),
                vencimento: p.dataVencimento ? formatDate(p.dataVencimento) : 'A definir'
            }))
        });
    } catch (error: any) {
        if (error.properties && error.properties.errors instanceof Array) {
            const errorMessages = error.properties.errors
                .map((e: any) => e.properties.explanation)
                .join('\n');
            console.error('Docxtemplater Multi Error:', errorMessages);
            throw new Error(`Erro no template Word: ${errorMessages}`);
        }
        throw error;
    }

    const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    // 4. Upload para o Storage
    const fileName = `${crypto.randomUUID()}.docx`;
    const filePath = `${projetoId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('contratos-gerados')
        .upload(filePath, out);

    if (uploadError) throw new Error(`Erro no upload do contrato: ${uploadError.message}`);

    // 5. Salvar na tabela contratos_gerados
    const { error: dbError } = await supabase
        .from('contratos_gerados')
        .insert({
            projeto_id: projetoId,
            arquivo_path: filePath
        });

    if (dbError) throw new Error(`Erro ao salvar registro do contrato: ${dbError.message}`);

    // 6. Obter Signed URL
    const { data: signedData, error: signedError } = await supabase.storage
        .from('contratos-gerados')
        .createSignedUrl(filePath, 60); // 60 segundos de validade

    if (signedError) throw new Error(`Erro ao gerar link de download: ${signedError.message}`);

    return signedData.signedUrl;
};
