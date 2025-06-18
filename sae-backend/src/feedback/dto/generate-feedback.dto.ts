
export interface GenerateFeedbackParams {
    repo: string;
    readme: string;
    code: string;
    gradeValue: number;
    gradeTotal: number;
    gradeFeedback: number;
    modelIA: string;
    reviewedBy: string;
    status: string;
    durationMs?: number;
    email: string;
    idTaskGithubClassroom: string;
    language: string;
    subject: string;
    studentLevel: string;
    topics: string;
    constraints: string;
    style: string;
    modelId: string; 
}