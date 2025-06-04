interface PromptOptions {
  language: string;
  subject: string;
  studentLevel: string;
  topics: string;
  constraints: string;
  style: string;
}

interface MCPPromptParts {
  context: string;
  instruction: string;
  input: string;
  userPrompt?: string;
}

export const buildMCPPromptParts = (
  readme: string,
  code: string,
  options: PromptOptions,
): MCPPromptParts => {
  const { language, subject, studentLevel, topics, constraints, style } = options;

  const context = `
  ### Actúa como un profesor universitario de Ingeniería Informática, especialista en evaluar código escrito en ${language}
para el curso ${subject}. Enseñas a estudiantes de nivel ${studentLevel} y tu objetivo es guiarlos para mejorar.
  
  ### Contexto: El estudiante ha entregado una solución en ${language}, correspondiente a un ejercicio que cubre los temas: ${topics}.  
Tu retroalimentación debe ayudar a mejorar su comprensión, resolver errores y desarrollar buenas prácticas.  
Debes tomar en cuenta lo siguiente: ${constraints} `;
  const userPrompt = ` Evalúa este código y proporciona una retroalimentación pedagógica. `;

  const instruction = ` ### Analiza el código proporcionado por el estudiante y genera una retroalimentación formativa y constructiva, basada en criterios pedagógicos definidos.
Actúa sabiendo que los criterios de una buena retroalimentación son los siguientes:

#### 1.Sugerencias generales: Buenas prácticas en ${language} (qué hacer y qué evitar).
#### 2.Verificación de requisitos: ¿El código cumple lo solicitado en el enunciado?
#### 3.Explicación con ejemplos: Explica brevemente los temas involucrados(${topics}), usando fragmentos de código si es necesario.
#### 4.Errores detectados: Errores de sintaxis, lógica o semántica.
#### 5.Mejoras y correcciones: Recomendaciones para optimizar o mejorar el código.
#### 6.Estilo y legibilidad: Evalúa si sigue el estilo de codificación **${style}**.
#### 7.Preguntas orientadoras: Preguntas que fomenten la reflexión del estudiante.
#### Nota final (1 al 10) Califica y justifica tu decisión brevemente.

--- `;

  const input = `
  ### Temas abordados: ${topics}
### Restricciones que deben cumplirse: ${constraints}
### Estilo requerido en el codigo: ${style}
---
### Enunciado del problema:
${readme}
---
### Código enviado por el estudiante:
\`\`\`${language}
${code}
\`\`\`

  ### Instrucciones de formato:
Organiza la retroalimentación con base en los siguientes criterios:
- 🟢 Sugerencias generales
- ✅ Verificación de requisitos
- 📖 Explicación con ejemplos
- 🚨 Errores detectados
- 🛠️ Mejoras y correcciones
- ✍️ Estilo y legibilidad
- 🤔 Preguntas orientadoras
- 📊 Nota final

---
### Utiliza un lenguaje profesional, claro, accesible y motivador, como lo haría un buen profesor que quiere que el estudiante aprenda y se sienta acompañado en su proceso.
### Si brindas fragmentos de codigo, debe seguir el estilo de codificación **${style}**.
---
Usa Markdown como formato de salida. 
**IMPORTANTE:** Al final de la retroalimentación, incluye siempre la línea:
**NOTA_RETROALIMENTACION: [X]**
Donde X es la nota final (puede ser decimal como 8.5). No pongas ningún otro texto en esa línea.
Ejemplo: **NOTA_RETROALIMENTACION: [7.5]**
---  
`;

  return { context, instruction, input, userPrompt };
};
