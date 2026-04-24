import { useEffect, useRef, useState } from "react";
import { log } from "../api/log.api";
import Sidebar from "../components/layout/Sidebar";
import VariablesModal from "../components/modals/VariablesModal";
import { IHttpRequest } from "../types/http";
import { useVariables } from "../hooks/useVariables";
import { useRequests } from "../hooks/useRequests";
import { IHttpGroup } from "../types/groups";
import { useGroups } from "../hooks/useGroups";
import styles from "../styles/screens/Workspace.module.css";
import RequestEditor from "../components/layout/RequestEditor";
import { ResponseViewer } from "../components/layout/ResponseViewer";
import { useLoadTest } from "../hooks/useLoadTest";
import { ResponseData } from "../types/response";
import { LoadTestModal } from "../components/modals/LoadTestModal";
import { useHotKey } from "../hooks/useHotKey";
import { clearRecentFile } from "../api/file.api";

interface WorkspaceProps {
  onExit: () => void;
}

function Workspace({ onExit }: WorkspaceProps) {
  const [activeRequest, setActiveRequest] = useState<IHttpRequest | null>(null);
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [newlyCreatedRequestId, setNewlyCreatedRequestId] = useState<string | null>(null);
  const [newlyCreatedGroupId, setNewlyCreatedGroupId] = useState<string | null>(null);
  const [isVariablesModalOpen, setIsVariablesModalOpen] = useState(false);
  const [isLoadTestModalOpen, setIsLoadTestModalOpen] = useState(false);
  const [isResponseVisible, setIsResponseVisible] = useState(false);
  const [loadTestConfig, setLoadTestConfig] = useState({
    totalRequests: 100,
    durationSecs: 10,
    concurrent: 10
  });

  const responseRef = useRef<HTMLDivElement>(null);
  const prevResponseRef = useRef<ResponseData | null>(null);

  const {
    variables,
    load: loadVariables,
    add: addVariable,
    update: updateVariable,
    remove: deleteVariable,
    error: variablesError,
    clearError: clearVariablesError
  } = useVariables();

  const {
    requests,
    loading,
    error: requestsError,
    load: loadRequests,
    create: createRequest,
    rename: renameRequest,
    update: updateRequest,
    move: moveRequest,
    remove: deleteRequest,
    execute: executeRequest
  } = useRequests();

  const {
    create: createGroup,
    rename: renameGroup,
    remove: deleteGroup
  } = useGroups({ reload: loadRequests });

  const {
    progress: loadTestProgress,
    running: loadTestRunning,
    error: loadTestError,
    result: loadTestResult,
    execute: executeLoadTest,
    clearError: clearLoadTestError
  } = useLoadTest();

  useHotKey({
    "`": e => {
      if (e.ctrlKey) {
        e.preventDefault();
        setIsResponseVisible(prev => !prev);
      }
    }
  });

  useEffect(() => {
    loadRequests();
    loadVariables();
  }, []);

  useEffect(() => {
    if (!response) return;
    const prev = prevResponseRef.current;
    const isNewResponse = !prev || prev.type !== response.type || prev !== response;
    if (isNewResponse) {
      setIsResponseVisible(true);
    }
    prevResponseRef.current = response;
  }, [response]);

  useEffect(() => {
    if (loadTestRunning && loadTestProgress > 0) {
      setResponse({
        type: "load-test",
        data: {
          totalRequests: 0,
          successful: 0,
          failed: 0,
          totalDurationMs: 0,
          avgResponseTimeMs: 0,
          minResponseTimeMs: 0,
          maxResponseTimeMs: 0,
          requestsPerSecond: 0,
          errors: [],
          statusCodes: {}
        },
        progress: loadTestProgress,
        running: true
      });
    } else if (!loadTestRunning && loadTestResult) {
      setResponse({
        type: "load-test",
        data: loadTestResult,
        progress: 1,
        running: false
      });
    }
  }, [loadTestRunning, loadTestResult, loadTestProgress]);

  const handleCreateGroup = async () => {
    try {
      const newGroupId = await createGroup("New Group");
      setNewlyCreatedGroupId(newGroupId);
    } catch (err) {
      log(`Failed to create group in workspace: ${err}`, "error");
    }
  };

  const handleCreateRequest = async (group?: IHttpGroup) => {
    try {
      const newRequestId = await createRequest(group?.id);
      setNewlyCreatedRequestId(newRequestId);
    } catch (err) {
      log(`Failed to create request in workspace: ${err}`, "error");
    }
  };

  const handleMoveRequest = async (
    requestId: string,
    fromGroupId: string | null,
    toGroupId: string | null
  ) => {
    try {
      await moveRequest(fromGroupId, requestId, toGroupId);
    } catch (err) {
      log(`Failed to move request: ${err}`, "error");
    }
  };

  const handleExecuteRequest = async (request: IHttpRequest) => {
    try {
      const httpResponse = await executeRequest(request);
      setResponse({ type: "http", data: httpResponse });
    } catch (err) {
      log(`Failed request execution workspace: ${err}`, "error");
    }
  };

  const handleExecuteLoadTest = async (request: IHttpRequest) => {
    try {
      await executeLoadTest(
        request.id,
        loadTestConfig.totalRequests,
        loadTestConfig.durationSecs,
        loadTestConfig.concurrent
      );
    } catch (err) {
      log(`Load test failed: ${err}`, "error");
    }
  };

  const handleOnVariables = () => {
    setIsVariablesModalOpen(true);
    clearVariablesError();
  };

  const handleOnLoadTest = () => {
    setIsLoadTestModalOpen(true);
  };

  const handleExit = async () => {
    await clearRecentFile();
    onExit();
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (requestsError) {
    return (
      <div>
        <h2>Error</h2>
        <p>{requestsError}</p>
      </div>
    );
  }

  if (!requests) {
    return (
      <div>
        <h2>No requests loaded</h2>
        <p>Try opening a file again</p>
      </div>
    );
  }

  return (
    <>
      <section className={styles.container}>
        <Sidebar
          requestsGroups={requests}
          onCreateGroup={handleCreateGroup}
          onGroupRename={renameGroup}
          onGroupDelete={deleteGroup}
          newlyCreatedGroupId={newlyCreatedGroupId}
          onGroupEditComplete={() => setNewlyCreatedGroupId(null)}
          onCreateRequest={handleCreateRequest}
          onRequestClick={(request: IHttpRequest) => setActiveRequest(request)}
          onRequestRename={renameRequest}
          onRequestDelete={deleteRequest}
          onMoveRequest={handleMoveRequest}
          onVariablesOpen={handleOnVariables}
          onLoadTestOpen={handleOnLoadTest}
          onExit={handleExit}
          newlyCreatedRequestId={newlyCreatedRequestId}
          onRequestEditComplete={() => setNewlyCreatedRequestId(null)}
        />
        <div className={styles.editorContainer}>
          <RequestEditor
            request={activeRequest}
            variables={variables ? Object.keys(variables) : []}
            onChange={updateRequest}
            onSend={handleExecuteRequest}
            onTest={handleExecuteLoadTest}
          />
          <div ref={responseRef} style={{ display: isResponseVisible ? "block" : "none" }}>
            <ResponseViewer response={response} />
          </div>
        </div>
      </section>
      <VariablesModal
        isOpen={isVariablesModalOpen}
        onClose={() => setIsVariablesModalOpen(false)}
        variables={variables}
        onAdd={addVariable}
        onUpdate={updateVariable}
        onDelete={deleteVariable}
        error={variablesError}
        onClearError={clearVariablesError}
      />
      <LoadTestModal
        isOpen={isLoadTestModalOpen}
        onClose={() => setIsLoadTestModalOpen(false)}
        initialValues={loadTestConfig}
        onSave={async values => {
          setLoadTestConfig(values);
          setIsLoadTestModalOpen(false);
        }}
      />
      {loadTestError && (
        <div className={styles.error}>
          <p>Load Test Error: {loadTestError}</p>
          <button onClick={clearLoadTestError}>Dismiss</button>
        </div>
      )}
    </>
  );
}

export default Workspace;
