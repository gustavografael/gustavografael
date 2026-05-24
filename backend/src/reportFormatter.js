const STATUS_LABELS = {
  healthy: "Saudável",
  warning: "Warning",
  critical: "Crítico",
  unknown: "Indeterminado"
};

export function formatMarkdownReport(run) {
  const lines = [
    `# Relatório Check Point - ${run.target.hostname}`,
    "",
    `- **Gateway/IP:** ${run.target.gatewayIp}`,
    `- **Executado em:** ${new Date(run.startedAt).toLocaleString("pt-BR")}`,
    `- **Duração:** ${run.durationMs} ms`,
    `- **Status geral:** ${STATUS_LABELS[run.overallStatus] ?? run.overallStatus}`,
    ""
  ];

  if (run.recommendations.length) {
    lines.push("## Recomendações automáticas", "");
    run.recommendations.forEach((recommendation) => {
      lines.push(`- **${recommendation.section}:** ${recommendation.text}`);
    });
    lines.push("");
  }

  run.sections.forEach((section) => {
    lines.push(`## ${section.title}`, "");
    lines.push(`**Status:** ${STATUS_LABELS[section.status] ?? section.status}`);
    lines.push("");
    lines.push(section.summary);
    lines.push("");

    if (section.metrics.length) {
      lines.push("| Métrica | Valor | Status |");
      lines.push("| --- | --- | --- |");
      section.metrics.forEach((item) => {
        lines.push(`| ${item.label} | ${item.value} | ${STATUS_LABELS[item.status] ?? item.status} |`);
      });
      lines.push("");
    }

    Object.entries(section.rawOutputs).forEach(([commandId, output]) => {
      lines.push(`<details><summary>Saída bruta: ${commandId}</summary>`);
      lines.push("");
      lines.push("```");
      lines.push(output || "Sem saída.");
      lines.push("```");
      lines.push("");
      lines.push("</details>");
      lines.push("");
    });
  });

  return lines.join("\n");
}
