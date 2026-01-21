module.exports = {
    apps: [
        {
            name: "ATS",
            script: "npm",
            args: "start",
            cwd: "/home/aliyan/ATS/_work/recruitment-management-system/recruitment-management-system",
            instances: "max",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
