@echo off
REM JUnit 4 test runner for the pure-JDK Teru Care backend.
REM No Maven/Gradle required; uses the JUnit 4 jar from Gradle's wrapper cache.

setlocal
set ROOT=%~dp0
set JUNIT_JAR=C:\Users\DELL\.gradle\wrapper\dists\gradle-8.14.3-bin\cv11ve7ro1n3o1j4so8xd9n66\gradle-8.14.3\lib\junit-4.13.2.jar
set HAMCREST_JAR=C:\Users\DELL\.gradle\wrapper\dists\gradle-8.14.3-bin\cv11ve7ro1n3o1j4so8xd9n66\gradle-8.14.3\lib\hamcrest-core-1.3.jar
set TEST_CP=%ROOT%out-test;%JUNIT_JAR%;%HAMCREST_JAR%

REM Compile the backend sources.
mkdir %ROOT%out-test 2>nul
javac -d %ROOT%out-test -sourcepath %ROOT%src\main\java %ROOT%src\main\java\terucare\model\Expense.java %ROOT%src\main\java\terucare\dsa\HashTable.java %ROOT%src\main\java\terucare\dsa\BinarySearchTree.java %ROOT%src\main\java\terucare\dsa\MergeSort.java %ROOT%src\main\java\terucare\dsa\Stack.java %ROOT%src\main\java\terucare\service\ExpenseService.java %ROOT%src\main\java\terucare\service\UndoManager.java %ROOT%src\main\java\terucare\store\FileStore.java %ROOT%src\main\java\terucare\server\Json.java %ROOT%src\main\java\terucare\server\ApiServer.java 2>&1 || goto error_compile

echo === Main sources compiled ===

REM Compile every project test class in one pass.
javac -cp "%TEST_CP%" -d %ROOT%out-test %ROOT%test\terucare\dsa\BinarySearchTreeTest.java %ROOT%test\terucare\dsa\HashTableTest.java %ROOT%test\terucare\dsa\MergeSortStabilityTest.java %ROOT%test\terucare\dsa\MergeSortTest.java %ROOT%test\terucare\dsa\StackTest.java %ROOT%test\terucare\service\ExpenseServiceTest.java 2>&1 || goto error_compile_test

echo === Running DSA and service tests ===
java -cp "%TEST_CP%" org.junit.runner.JUnitCore terucare.dsa.BinarySearchTreeTest 2>&1 || goto test_failed
java -cp "%TEST_CP%" org.junit.runner.JUnitCore terucare.dsa.HashTableTest 2>&1 || goto test_failed
java -cp "%TEST_CP%" org.junit.runner.JUnitCore terucare.dsa.MergeSortTest 2>&1 || goto test_failed
java -cp "%TEST_CP%" org.junit.runner.JUnitCore terucare.dsa.MergeSortStabilityTest 2>&1 || goto test_failed
java -cp "%TEST_CP%" org.junit.runner.JUnitCore terucare.dsa.StackTest 2>&1 || goto test_failed
java -cp "%TEST_CP%" org.junit.runner.JUnitCore terucare.service.ExpenseServiceTest 2>&1 || goto test_failed

echo === All tests passed ===
goto :eof

:test_failed
echo FAILED: A test returned a non-zero exit code.
exit /b 1

:error_compile
echo ERROR: Main source compilation failed.
exit /b 1

:error_compile_test
echo ERROR: Test source compilation failed.
exit /b 1
