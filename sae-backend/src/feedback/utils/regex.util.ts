//Funcion para extraer la nota de retroalimentación de un string
export function extractGradeFromFeedback(feedback: string): number {
    const notaRegex = /\*{2}NOTA_RETROALIMENTACION:\s*\[?\s*(\d+(?:[.,]\d+)?)\s*\]?\*{2}/i;
    const match = feedback.match(notaRegex);
    return match ? parseFloat(match[1].replace(',', '.')) : 0;
}