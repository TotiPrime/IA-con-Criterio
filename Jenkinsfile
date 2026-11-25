pipeline {
    agent any

    options {
        skipDefaultCheckout()
        disableConcurrentBuilds()
        timestamps()
        timeout(time: 10, unit: 'MINUTES')
    }

    stages {
        stage('Descargar código') {
            steps {
                deleteDir()
                checkout scm
            }
        }
        stage('Verificar Node.js') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'node --version'
                    } else {
                        bat 'node --version'
                    }
                }
            }
        }
        stage('Ejecutar pruebas unitarias') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'node scripts/run-ci.mjs'
                    } else {
                        bat 'node scripts/run-ci.mjs'
                    }
                }
            }
        }
        stage('Ejecutar pruebas Gherkin (BDD)') {
            steps {
                script {
                    if (isUnix()) {
                        sh 'node scripts/run-gherkin.mjs'
                    } else {
                        bat 'node scripts/run-gherkin.mjs'
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                if (fileExists('reports/junit.xml') || fileExists('reports/gherkin-junit.xml')) {
                    junit allowEmptyResults: true, testResults: 'reports/*.xml'
                }
                if (fileExists('reports/cucumber-report.json') || fileExists('reports/cucumber-report.html') || fileExists('reports/junit.xml')) {
                    archiveArtifacts artifacts: 'reports/*', fingerprint: true
                }
                if (fileExists('reports/cucumber-report.json')) {
                    try {
                        cucumber buildStatus: 'UNSTABLE',
                            fileIncludePattern: '**/cucumber-report.json',
                            jsonReportDirectory: 'reports',
                            sortingMethod: 'ALPHABETICAL'
                    } catch (NoSuchMethodError ignored) {
                        echo 'Plugin Cucumber Reports no instalado en Jenkins; los reportes JSON, JUnit XML y HTML quedaron archivados en reports/.'
                    }
                }
            }
        }
    }
}
