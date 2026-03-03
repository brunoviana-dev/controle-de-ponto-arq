/**
 * Aplica máscara de CNPJ (00.000.000/0000-00)
 */
export const maskCNPJ = (value: string) => {
    const v = value.replace(/\D/g, "");
    return v
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2")
        .substring(0, 18);
};

/**
 * Aplica máscara de Telefone ((00) 0000-0000 ou (00) 00000-0000)
 */
export const maskTelefone = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length <= 10) {
        return v
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2")
            .substring(0, 14);
    } else {
        return v
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{5})(\d)/, "$1-$2")
            .substring(0, 15);
    }
};

/**
 * Aplica máscara de CEP (00000-000)
 */
export const maskCEP = (value: string) => {
    const v = value.replace(/\D/g, "");
    return v
        .replace(/^(\d{5})(\d)/, "$1-$2")
        .substring(0, 9);
};
