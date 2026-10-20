-- Auditoria somente leitura para preparação da limpeza pré-lançamento.
-- NÃO apaga dados, NÃO reinicia o banco, NÃO altera permissões.
SELECT 'courses' AS tabela, COUNT(*) AS registros FROM courses
UNION ALL SELECT 'disciplines', COUNT(*) FROM disciplines
UNION ALL SELECT 'contents', COUNT(*) FROM contents
UNION ALL SELECT 'questions', COUNT(*) FROM questions
UNION ALL SELECT 'courseDisciplines', COUNT(*) FROM courseDisciplines
UNION ALL SELECT 'disciplineContents', COUNT(*) FROM disciplineContents
UNION ALL SELECT 'questionContentLinks', COUNT(*) FROM questionContentLinks
UNION ALL SELECT 'courseEnrollments', COUNT(*) FROM courseEnrollments
UNION ALL SELECT 'commercePlans', COUNT(*) FROM commercePlans
UNION ALL SELECT 'commercePlanCourses', COUNT(*) FROM commercePlanCourses
UNION ALL SELECT 'commerceOrders', COUNT(*) FROM commerceOrders
UNION ALL SELECT 'commerceOrderItems', COUNT(*) FROM commerceOrderItems
UNION ALL SELECT 'commerceTransactions', COUNT(*) FROM commerceTransactions
UNION ALL SELECT 'studyContentProgress', COUNT(*) FROM studyContentProgress
UNION ALL SELECT 'studyRoadmapItems', COUNT(*) FROM studyRoadmapItems
UNION ALL SELECT 'studyAnswers', COUNT(*) FROM studyAnswers
UNION ALL SELECT 'simulationRecords', COUNT(*) FROM simulationRecords
UNION ALL SELECT 'simulationQuestions', COUNT(*) FROM simulationQuestions
UNION ALL SELECT 'competitionRounds', COUNT(*) FROM competitionRounds
UNION ALL SELECT 'competitionAnswers', COUNT(*) FROM competitionAnswers
UNION ALL SELECT 'studyReviewItems', COUNT(*) FROM studyReviewItems
UNION ALL SELECT 'reviewQueue', COUNT(*) FROM reviewQueue
UNION ALL SELECT 'questionChangelog', COUNT(*) FROM questionChangelog
UNION ALL SELECT 'contentChangelog', COUNT(*) FROM contentChangelog
UNION ALL SELECT 'platformAlerts', COUNT(*) FROM platformAlerts;
SELECT status, COUNT(*) AS quantidade FROM commerceOrders GROUP BY status;
SELECT status, COUNT(*) AS quantidade FROM courseEnrollments GROUP BY status;
SELECT action, COUNT(*) AS quantidade FROM adminAuditLogs WHERE action = 'LIMPEZA_CATALOGO_PRE_LANCAMENTO' GROUP BY action;
