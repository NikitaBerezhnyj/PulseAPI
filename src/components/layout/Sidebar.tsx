import { useState, useRef, useEffect } from "react";
import RequestList from "../sidebar/RequestList";
import styles from "../../styles/components/layout/Sidebar.module.css";
import { IHttpGroup } from "../../types/groups";
import { IHttpRequest } from "../../types/http";
import { HeartPulse, LogOut, FlaskConical, Variable, Menu, Plus } from "lucide-react";
import { useResizable } from "../../hooks/useResizable";

interface SidebarProps {
  requestsGroups: IHttpGroup[];
  onCreateGroup: () => void;
  onGroupRename: (group: IHttpGroup, newName: string) => void;
  onGroupDelete: (group: IHttpGroup) => void;
  newlyCreatedGroupId: string | null;
  onGroupEditComplete: () => void;
  onRequestClick?: (request: IHttpRequest) => void;
  onCreateRequest: (group?: IHttpGroup) => void;
  onRequestRename: (request: IHttpRequest, newName: string) => void;
  onRequestDelete(request: IHttpRequest): void;
  onMoveRequest: (requestId: string, fromGroupId: string | null, toGroupId: string | null) => void;
  newlyCreatedRequestId: string | null;
  onRequestEditComplete: () => void;
  onVariablesOpen: () => void;
  onLoadTestOpen: () => void;
  onExit: () => void;
}

function Sidebar({
  requestsGroups,
  onRequestClick,
  onCreateRequest,
  onCreateGroup,
  onGroupRename,
  onGroupDelete,
  newlyCreatedGroupId,
  onGroupEditComplete,
  onRequestRename,
  onRequestDelete,
  onMoveRequest,
  onVariablesOpen,
  onLoadTestOpen,
  onExit,
  newlyCreatedRequestId,
  onRequestEditComplete
}: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filteredGroups, setFilteredGroups] = useState<IHttpGroup[]>(requestsGroups);
  const debounceRef = useRef<number | null>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { size, isResizing, handleMouseDown } = useResizable({
    direction: "horizontal",
    minSize: 225,
    maxSize: 500,
    defaultSize: 260
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        footerRef.current &&
        !footerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setFilteredGroups(requestsGroups);
  }, [requestsGroups]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(() => {
      const query = search.trim().toLowerCase();
      if (!query) {
        setFilteredGroups(requestsGroups);
        return;
      }
      const result: IHttpGroup[] = [];
      for (const group of requestsGroups) {
        const matchedRequests = group.requests.filter(req =>
          req.name.toLowerCase().includes(query)
        );
        if (matchedRequests.length > 0) {
          result.push({
            ...group,
            requests: matchedRequests
          });
        }
      }
      setFilteredGroups(result);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, requestsGroups]);

  return (
    <aside className={styles.sidebar} style={{ width: `${size}px` }}>
      <div className={styles.header}>
        <h1>
          <HeartPulse /> <span>PulseAPI</span>
        </h1>
      </div>
      <div className={styles.actionBar}>
        <div>
          <button
            className={styles.primaryAction}
            title="Create new request"
            onClick={() => {
              onCreateRequest();
            }}
          >
            <Plus size={16} />
            <span>Request</span>
          </button>
          <button
            className={styles.secondaryAction}
            title="Create new group"
            onClick={onCreateGroup}
          >
            <Plus size={14} />
            <span>Group</span>
          </button>
        </div>
        <input
          type="text"
          placeholder="Search requests..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search requests"
        />
      </div>
      <RequestList
        groups={filteredGroups}
        onGroupRename={onGroupRename}
        onGroupDelete={onGroupDelete}
        newlyCreatedGroupId={newlyCreatedGroupId}
        onGroupEditComplete={onGroupEditComplete}
        onCreateRequest={onCreateRequest}
        onRequestClick={onRequestClick}
        onRequestRename={onRequestRename}
        onRequestDelete={onRequestDelete}
        onMoveRequest={onMoveRequest}
        newlyCreatedRequestId={newlyCreatedRequestId}
        onRequestEditComplete={onRequestEditComplete}
      />
      <div ref={footerRef} className={styles.footer} onClick={() => setOpen(v => !v)}>
        <Menu />
        <span>Menu</span>
      </div>
      {open && (
        <div className={styles.settingsMenu} ref={menuRef}>
          <button
            onClick={() => {
              onVariablesOpen();
              setOpen(false);
            }}
          >
            <span>Variables</span>
            <Variable />
          </button>
          <button
            onClick={() => {
              onLoadTestOpen();
              setOpen(false);
            }}
          >
            <span>Load Test</span>
            <FlaskConical />
          </button>
          <button
            onClick={() => {
              onExit();
              setOpen(false);
            }}
          >
            <span>Exit</span>
            <LogOut />
          </button>
        </div>
      )}
      <div
        className={`${styles.resizer} ${isResizing ? styles.resizing : ""}`}
        onMouseDown={handleMouseDown}
      />
    </aside>
  );
}

export default Sidebar;
