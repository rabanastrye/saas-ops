const axios = require('axios');

// Projetos a monitorizar
const projects = [
  { name: 'agendapro', url: 'https://agendapro.vercel.app' },
  { name: 'orcapro', url: 'https://orcapro.vercel.app' },
  { name: 'gym-sales', url: 'https://gym-sales.vercel.app' },
  { name: 'saas-ops', url: 'https://saas-ops.vercel.app' },
];

async function orchestrate() {
  console.log('?? Orquestrador iniciado...');

  try {
    // Dispara agentes em paralelo
    const results = await Promise.allSettled(
      projects.map(async (project) => {
        try {
          const response = await axios.post(
            `${project.url}/api/agents/orchestrate`,
            {},
            {
              headers: {
                Authorization: `Bearer ${process.env.AGENT_SECRET_KEY}`,
              },
              timeout: 30000,
            }
          );
          console.log(`? ${project.name}: ${response.status}`);
          return { project: project.name, status: response.status, data: response.data };
        } catch (error) {
          console.error(`? ${project.name}: ${error.message}`);
          return { project: project.name, status: 'error', error: error.message };
        }
      })
    );

    // Resumo
    const summary = results.map((r) => r.value);
    console.log('\n?? Resumo:', JSON.stringify(summary, null, 2));

    // Notificar Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `? Orquestração concluída\n${summary.map((r) => `• ${r.project}: ${r.status}`).join('\n')}`,
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('? Erro:', error.message);
    process.exit(1);
  }
}

orchestrate();
