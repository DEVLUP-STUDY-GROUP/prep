pipeline {
    agent any

    environment {
        DEPLOY_PATH = '/app/service/prep'
        SSH_HOST = '115.68.179.155'
        SSH_USER = 'ec2-user'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Deploy') {
            steps {
                withCredentials([file(credentialsId: 'prep-env-dev', variable: 'ENV_FILE')]) {
                    sshagent(['prep-dev-deploy-ssh-key']) {
                        sh '''
                            # 기존 .env 파일 제거 후 전송
                            ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} "rm -f /tmp/prep.env"
                            scp -o StrictHostKeyChecking=no ${ENV_FILE} ${SSH_USER}@${SSH_HOST}:/tmp/prep.env

                            ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} << 'ENDSSH'
                                set -e

                                DEPLOY_PATH=/app/service/prep

                                # .git 폴더 존재 여부로 판단
                                if [ -d "$DEPLOY_PATH/.git" ]; then
                                    cd $DEPLOY_PATH
                                    git fetch origin
                                    git reset --hard origin/develop
                                else
                                    # 디렉토리 정리 후 clone
                                    rm -rf $DEPLOY_PATH/*
                                    rm -rf $DEPLOY_PATH/.* 2>/dev/null || true
                                    git clone -b develop https://github.com/DEVLUP-STUDY-GROUP/prep.git $DEPLOY_PATH
                                fi

                                # .env 파일 복사
                                mv /tmp/prep.env $DEPLOY_PATH/server/.env

                                # npm install 및 PM2 재시작
                                cd $DEPLOY_PATH/server
                                npm install --omit=dev
                                pm2 restart prep || pm2 start $DEPLOY_PATH/server/src/app.js --name prep
ENDSSH
                        '''
                    }
                }
            }
        }
    }

    post {
        success {
            echo '배포 성공!'
        }
        failure {
            echo '배포 실패!'
        }
    }
}
