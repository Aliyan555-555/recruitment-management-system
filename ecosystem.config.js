module.exports = {
    apps: [
        {
            name: "ATS",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3001",
            cwd: "/home/aliyan/ATS/_work/recruitment-management-system/recruitment-management-system",
            instances: "max",
            exec_mode: "cluster",
            env: {
                NODE_ENV: "production",
            },
        },
    ],
};
