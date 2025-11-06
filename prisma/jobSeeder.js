const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()


async function seedJobs() {
    console.log('\n🧑‍💼 Creating demo jobs...')

    // EmploymentType enum (copy from schema; adapt as needed if changed)
    const admin = {
        id: 1,
    };
    const interviewer = {
        id: 2,
    };
    const now = BigInt(Math.floor(Date.now() / 1000));
    const EmploymentType = {
        Permanent: 'Permanent',
        PartTime: 'PartTime',
        Contract: 'Contract'
    };

    const jobEntries = [
        {
            jobCode: 'JOB001',
            title: 'Frontend Developer (React.js)',
            shortDescription: 'Join our UI team and build interactive React dashboards.',
            description: `
        <h1>Frontend Developer Role</h1>
        <p>We are looking for a skilled developer to work with React.js, Next.js and Tailwind CSS.</p>
        <h2>Responsibilities</h2>
        <ul>
          <li>Build pixel-perfect, responsive interfaces</li>
          <li>Integrate APIs</li>
          <li>Collaborate with UI/UX designers</li>
        </ul>
        <h3>Requirements</h3>
        <ol>
          <li>2+ years experience</li>
          <li>Strong JavaScript/TypeScript skills</li>
        </ol>
      `,
            company: 'Acme Tech',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 30 * 24 * 3600 * 1000),
            status: true,
            industry: 'Software',
            employmentType: EmploymentType.Permanent,
            employmentShift: 'Day',
            totalPositions: 2,
            minimumExperience: '2 years',
            minimumSalary: '50000',
            createdBy: admin.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB002',
            title: 'Backend API Engineer',
            shortDescription: 'Work with Node.js, Express.js, and PostgreSQL.',
            description: `
        <h1>Backend API Engineering</h1>
        <p>Design scalable REST APIs and write optimized queries.</p>
        <h2>Responsibilities</h2>
        <ul>
          <li>Design database schemas</li>
          <li>Create secure authentication logic</li>
          <li>Monitor server logs</li>
        </ul>
      `,
            company: 'Innovatech',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 45 * 24 * 3600 * 1000),
            status: true,
            industry: 'Technology',
            employmentType: EmploymentType.Permanent,
            employmentShift: 'Day',
            totalPositions: 1,
            minimumExperience: '3 years',
            minimumSalary: '60000',
            createdBy: interviewer.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB003',
            title: 'QA Automation Engineer',
            shortDescription: 'Automate test suites using Cypress & Selenium.',
            description: `
        <h1>QA Automation</h1>
        <h2>What You’ll Do</h2>
        <ul>
          <li>Write automated test scripts</li>
          <li>Report bugs with evidence</li>
          <li>Maintain pipelines</li>
        </ul>
      `,
            company: 'TestHub',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 60 * 24 * 3600 * 1000),
            status: true,
            industry: 'QA',
            employmentType: EmploymentType.PartTime,
            employmentShift: 'Day',
            totalPositions: 1,
            minimumExperience: '2 years',
            minimumSalary: '55000',
            createdBy: admin.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB004',
            title: 'DevOps Engineer',
            shortDescription: 'Handle CI/CD pipelines, Docker, Kubernetes.',
            description: `
        <h1>DevOps Engineering</h1>
        <p>Responsible for managing infrastructure automation.</p>
        <h2>Tools You Will Use</h2>
        <ul>
          <li>Docker, Kubernetes</li>
          <li>GitHub Actions</li>
          <li>Grafana Monitoring</li>
        </ul>
      `,
            company: 'CloudOps',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 50 * 24 * 3600 * 1000),
            status: true,
            industry: 'Cloud',
            employmentType: EmploymentType.Permanent,
            employmentShift: 'Night',
            totalPositions: 2,
            minimumExperience: '3 years',
            minimumSalary: '80000',
            createdBy: admin.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB005',
            title: 'Mobile App Developer (React Native)',
            shortDescription: 'Build cross-platform mobile apps.',
            description: `
        <h1>Mobile Development</h1>
        <p>Work with React Native, Expo, Push Notifications.</p>
        <h2>Responsibilities</h2>
        <ul>
          <li>Create responsive app screens</li>
          <li>Integrate REST APIs</li>
        </ul>
      `,
            company: 'AppNation',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 40 * 24 * 3600 * 1000),
            status: true,
            industry: 'Mobile',
            employmentType: EmploymentType.Contract,
            employmentShift: 'Flexible',
            totalPositions: 1,
            minimumExperience: '2 years',
            minimumSalary: '70000',
            createdBy: interviewer.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB006',
            title: 'UI/UX Designer',
            shortDescription: 'Work with Figma, UX flows, Prototyping.',
            description: `
        <h1>UI/UX Design Responsibilities</h1>
        <p>Design beautiful dashboards, flows, and components.</p>
        <h2>Must Have</h2>
        <ul>
          <li>Strong Figma skills</li>
          <li>Knowledge of Material UI</li>
        </ul>
      `,
            company: 'Designify',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 35 * 24 * 3600 * 1000),
            status: true,
            industry: 'Design',
            employmentType: EmploymentType.Permanent,
            employmentShift: 'Day',
            totalPositions: 2,
            minimumExperience: '1 year',
            minimumSalary: '45000',
            createdBy: admin.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB007',
            title: 'Database Administrator (PostgreSQL)',
            shortDescription: 'Manage indexes, backups, and query optimization.',
            description: `
        <h1>DBA Responsibilities</h1>
        <ul>
          <li>Perform daily backups</li>
          <li>Handle replication</li>
          <li>Optimize slow queries</li>
        </ul>
      `,
            company: 'DataCore',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 25 * 24 * 3600 * 1000),
            status: true,
            industry: 'Database',
            employmentType: EmploymentType.Permanent,
            employmentShift: 'Day',
            totalPositions: 1,
            minimumExperience: '3 years',
            minimumSalary: '65000',
            createdBy: interviewer.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB008',
            title: 'System Administrator (Linux)',
            shortDescription: 'Handle Linux servers, security patches.',
            description: `
        <h1>System Admin</h1>
        <ul>
          <li>Patch management</li>
          <li>User permissions</li>
          <li>Firewall rules</li>
        </ul>
      `,
            company: 'SecureIT',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 55 * 24 * 3600 * 1000),
            status: true,
            industry: 'Infrastructure',
            employmentType: EmploymentType.Contract,
            employmentShift: 'Night',
            totalPositions: 2,
            minimumExperience: '2 years',
            minimumSalary: '60000',
            createdBy: admin.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB009',
            title: 'AI / Machine Learning Engineer',
            shortDescription: 'Work with TensorFlow, NLP, Vision.',
            description: `
        <h1>AI Engineering</h1>
        <p>You will train ML models and improve data pipelines.</p>
        <h2>Tech Stack</h2>
        <ul>
          <li>Python</li>
          <li>TensorFlow / PyTorch</li>
          <li>OpenAI API</li>
        </ul>
      `,
            company: 'AI Lab',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 70 * 24 * 3600 * 1000),
            status: true,
            industry: 'Artificial Intelligence',
            employmentType: EmploymentType.Permanent,
            employmentShift: 'Flexible',
            totalPositions: 3,
            minimumExperience: '2 years',
            minimumSalary: '90000',
            createdBy: interviewer.id,
            createdAt: now,
            updatedAt: now,
        },

        {
            jobCode: 'JOB010',
            title: 'Cybersecurity Analyst',
            shortDescription: 'Identify threats, monitor SIEM logs.',
            description: `
        <h1>Security Analyst</h1>
        <p>Monitor security infrastructure and respond to incidents.</p>
        <h2>Responsibilities</h2>
        <ul>
          <li>SIEM monitoring</li>
          <li>Penetration testing</li>
          <li>Incident reporting</li>
        </ul>
      `,
            company: 'SecureOps',
            postFrom: new Date(),
            postTo: new Date(Date.now() + 40 * 24 * 3600 * 1000),
            status: true,
            industry: 'Security',
            employmentType: EmploymentType.Permanent,
            employmentShift: 'Day',
            totalPositions: 1,
            minimumExperience: '3 years',
            minimumSalary: '100000',
            createdBy: admin.id,
            createdAt: now,
            updatedAt: now,
        },
    ];


    for (const job of jobEntries) {
        await prisma.job.upsert({
            where: { jobCode: job.jobCode },
            update: job,
            create: job,
        });
    }
    console.log('\n🎉 Demo jobs seeded!');
}

seedJobs();
