import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:8000';

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const initialNode = {
  id: 0,
  sender: 'ai',
  content: '',
  children: []
};

function App() {
  const [tree, setTree] = useState(initialNode);
  const [selectedNode, setSelectedNode] = useState(tree);
  const [nextId, setNextId] = useState(1);  // Start counter at 1
  const [path, setPath] = useState([tree.id]);
  const [inputText, setInputText] = useState('');
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const isInputDisabled = selectedNode.children.length > 0;


  /**
   * Creates a new node and adds it to the specified parent.
   * If the sender is 'ai', it makes an API call to get the content.
   * @param {Object} parent - The parent node to which the new node will be added.
   * @param {string} sender - The sender of the new node ('ai' or 'user').
   * @param {string} [content=''] - The content of the new node (used for user nodes).
   */
  const addNode = async (parent, sender, content = '') => {
    let newNode = {
      id: nextId,
      sender: sender,
      content: content,
      children: []
    };

    if (sender === 'ai') {
      try {
        const pathToParent = findPathToNode(tree, parent.id);
        const messages = convertPathToMessages([...pathToParent, { role: 'user', content: content }]);

        const response = await axiosInstance.post('/chat', {
          messages: messages,
          llm_choice: 'mock' // You might want to make this configurable
        });
        newNode.content = response.data.response;
      } catch (error) {
        console.error("There was an error calling the API:", error);
        newNode.content = "Error: Couldn't generate AI response";
      }
    }

    parent.children.push(newNode);
    setNextId(nextId + 1);
    setTree({ ...tree });
    setSelectedNode(newNode);
    handleNodeSelect(newNode);
  };


  /**
   * Creates a new node with a child, then adds the new node to the specified parent.
   * If the sender is 'user', it also makes an API call to get an AI response.
   * @param {Object} parent - The parent node to which the new node will be added.
   * @param {string} sender - The sender of the new node ('ai' or 'user').
   * @param {string} [content=''] - The content of the new node.
   * @param {string} [llmChoice='mock'] - The LLM choice for the API call.
   */
  const addNodeWithChild = async (parent, sender, content = '', llmChoice = 'mock') => {
    //console.log('Adding node with child. Parent:', parent, 'Sender:', sender);
    const newNode = {
      id: nextId,
      sender: sender,
      content: content,
      children: []
    };
    parent.children.push(newNode);
    setNextId(nextId + 1);
    setTree({ ...tree });
    setSelectedNode(newNode);
    setShouldScrollToBottom(true);

    if (sender === 'user') {
      try {
        const updatedTree = findNodeById(tree, 0); // Get the latest tree state
        const pathToNode = findPathToNode(updatedTree, newNode.id);
        //console.log('Path to new node:', pathToNode);
        if (!pathToNode) {
          throw new Error(`Could not find path to node with id ${newNode.id}`);
        }
        const messages = convertPathToMessages(pathToNode);

        const response = await axiosInstance.post('/chat', {
          messages: messages,
          llm_choice: llmChoice
        });

        const aiResponse = response.data.response;

        const childNode = {
          id: nextId + 1,
          sender: 'ai',
          content: aiResponse,
          children: []
        };
        newNode.children.push(childNode);
        setNextId(nextId + 2);
        setTree({ ...tree });
        setSelectedNode(childNode);
        handleNodeSelect(childNode);
        setShouldScrollToBottom(true);
      } catch (error) {
        console.error("There was an error calling the API:", error);
      }
    }
  };

  /**
   * Adds a child node to the selected node (DEEPEN action).
   * @param {Object} node - The node to which a new child will be added.
   * @param {string} [content=''] - The content of the new node.
   */
  const addDeepenNode = (node, content = '') => {
    addNodeWithChild(node, node.sender === 'ai' ? 'user' : 'ai', content);
  };

  /**
   * Adds a sibling node to the selected node (BROADEN action).
   * @param {Object} node - The node for which a sibling will be added.
   * @param {string} [content=''] - The content of the new node.
   */
  const addBroadenNode = (node, content = '') => {
    if (node.id === 0) return;  // Cannot broaden at root

    const parent = findParent(tree, node.id);
    if (node.sender === 'user') {
      addNodeWithChild(parent, 'user', content);
    } else {
      addNode(parent, 'ai', content);
    }
  };

  /**
   * Handles input change in the text field.
   * @param {Event} e - The input change event.
   */
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };

  /**
   * Handles submission of user input.
   */
  const handleSubmit = () => {
    if (!isInputDisabled && (inputText.trim() !== '' || selectedNode.sender === 'ai')) {
      addDeepenNode(selectedNode, inputText);
      setInputText('');
    }
  };


  /**
   * Recursively searches for the parent of a given node by ID.
   * @param {Object} current - The current node being checked.
   * @param {number} id - The ID of the node whose parent is being searched for.
   * @param {Object} [parent=null] - The parent of the current node in the recursion.
   * @returns {Object|null} The parent node if found; otherwise, null.
   */
  const findParent = (current, id, parent = null) => {
    if (current.id === id) return parent;
    for (let child of current.children) {
      const result = findParent(child, id, current);
      if (result) return result;
    }
    return null;
  };

  /**
   * Handles selecting a node, finding and setting the path from the root to this node.
   * @param {Object} node - The node that was selected.
   */
  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    const newPath = findPathToNode(tree, node.id);
    setPath(newPath);
  };

  /**
   * Recursively finds the path from the root to the specified node.
   * @param {Object} node - The current node being checked.
   * @param {number} targetId - The ID of the node to which the path is being found.
   * @param {Array} [path=[]] - The accumulated path so far.
   * @returns {Array|null} The path to the target node if found; otherwise, null.
   */
  const findPathToNode = (node, targetId, path = []) => {
    // Add current node to the path
    path.push({
      id: node.id,
      role: node.sender === 'user' ? 'user' : 'assistant',
      content: node.content
    });

    // Check if the current node is the target node
    if (node.id === targetId) {
      return path;
    }

    // Recursively search in children
    for (let child of node.children) {
      const result = findPathToNode(child, targetId, [...path]); // Pass a copy to avoid mutating the original path
      if (result) return result;
    }

    // If not found in this branch, backtrack
    return null;
  };

  /**
   * Converts the path to a format suitable for LLM API calls.
   * @param {Array} path - The path to be converted.
   * @returns {Array} The converted path with system message prepended.
   */
  const convertPathToMessages = (path) => {
    return [
      { role: "system", content: "You are a helpful assistant." },
      ...path.map(node => ({
        role: node.role,
        content: node.content
      }))
    ];
  };


  /**
   * Renders a single tree node and its children recursively.
   * @param {Object} props - The component props.
   * @param {Object} props.tree - The tree to render.
   * @param {Object} props.selectedNode - The currently selected node.
   * @param {Function} props.onNodeSelect - Function to handle node selection.
   * @returns {JSX.Element} The JSX representation of the tree.
   */
  const TreeView = React.memo(({ tree, selectedNode, onNodeSelect }) => {
    const renderTreeNode = (node) => (
      <div key={node.id} style={{ marginTop: '5px' }}>
        <div
          style={{
            color: node.sender === 'ai' ? 'darkblue' : 'darkgreen',
            border: selectedNode.id === node.id ? '2px solid black' : 'none',
            padding: '5px',
            cursor: 'pointer',
            backgroundColor: selectedNode.id === node.id ? '#f0f0f0' : 'transparent',
            display: 'inline-block',
            minWidth: '150px',
          }}
          onClick={() => onNodeSelect(node)}
        >
          {node.sender === 'ai' ? 'AI' : 'User'} Node {node.id}: {node.content}
        </div>
        {/* Use Flexbox to layout children side by side */}
        <div style={{ display: 'flex' }}>
          {node.children.map(child => renderTreeNode(child))}
        </div>
      </div>
    );

    return (
      <div style={{
        border: '1px solid #ccc',
        borderRadius: '5px',
        padding: '10px',
        marginRight: '20px',
        width: '500px',
        height: '400px',
        overflow: 'auto'
      }}>
        <h3>Conversation Tree:</h3>
        <div style={{ 
          display: 'inline-block',  // Changed to inline-block
          minWidth: '100%',  // Ensures the content takes at least full width
        }}>
          {renderTreeNode(tree)}
        </div>
      </div>
    );
  });


  /**
   * Renders a single path item with appropriate styling.
   * @param {Object} props - The component props.
   * @param {number} props.id - The ID of the node.
   * @param {string} props.sender - The sender type ('ai' or 'user').
   * @param {string} props.content - The content of the node.
   * @param {Function} props.onRegenerate - Function to handle regeneration.
   * @param {Function} props.onEdit - Function to handle editing.
   * @param {Function} props.onNavigateSibling - Function to handle sibling navigation.
   * @param {boolean} props.hasSiblings - Whether the node has siblings.
   * @returns {JSX.Element} A styled div representing the path item.
   */
  const PathItem = ({ id, sender, content, onRegenerate, onEdit, onNavigateSibling, hasSiblings }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(content);

    const startEditing = () => {
      setIsEditing(true);
    };

    const finishEditing = () => {
      onEdit(id, editContent);
      setIsEditing(false);
    };

    return (
      <div
        style={{
          backgroundColor: sender === 'ai' ? 'lightblue' : 'lightgreen',
          padding: '5px',
          margin: '2px 0',
          borderRadius: '3px',
          width: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div style={{ marginRight: '10px' }}>
          <button 
            onClick={() => onNavigateSibling(id, 'left')} 
            disabled={!hasSiblings}
            style={{ opacity: hasSiblings ? 1 : 0.5 }}
          >
            ←
          </button>
          <button 
            onClick={() => onNavigateSibling(id, 'right')} 
            disabled={!hasSiblings}
            style={{ opacity: hasSiblings ? 1 : 0.5 }}
          >
            →
          </button>
        </div>
        <div style={{ flex: 1 }}>
          <div><strong>Node {id}</strong> ({sender})</div>
          {isEditing ? (
            <div>
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && finishEditing()}
              />
              <button onClick={finishEditing}>Send</button>
            </div>
          ) : (
            <div style={{ wordBreak: 'break-word' }}>{content || '<empty>'}</div>
          )}
        </div>
        {isHovered && !isEditing && id !== 0 && (
          <div style={{ position: 'absolute', right: '5px', top: '5px' }}>
            {sender === 'ai' ? (
              <button onClick={() => onRegenerate(id)}>Regenerate</button>
            ) : (
              <button onClick={startEditing}>Edit</button>
            )}
          </div>
        )}
      </div>
    );
  };




  /**
   * Recursively finds a node in the tree by its ID.
   * @param {Object} node - The current node being checked.
   * @param {number} id - The ID of the node to find.
   * @returns {Object|null} The found node, or null if not found.
   */
  const findNodeById = (node, id) => {
    if (node.id === id) return node;
    for (let child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
    return null;
  };

  /**
   * Handles regeneration of an AI node.
   * @param {number} nodeId - The ID of the node to regenerate.
   */
  const handleRegenerate = (nodeId) => {
    const node = findNodeById(tree, nodeId);
    handleNodeSelect(node);
    addBroadenNode(node);
  };

  /**
   * Handles editing of a user node.
   * @param {number} nodeId - The ID of the node to edit.
   * @param {string} newContent - The new content for the node.
   */
  const handleEdit = (nodeId, newContent) => {
    const node = findNodeById(tree, nodeId);
    handleNodeSelect(node);
    addBroadenNode(node, newContent);
  };


  /**
   * Navigates to a sibling node.
   * @param {number} nodeId - The ID of the current node.
   * @param {string} direction - The direction to navigate ('left' or 'right').
   */
  const navigateToSibling = (nodeId, direction) => {
    const parent = findParent(tree, nodeId);
    if (!parent) return;

    setShouldScrollToBottom(false);

    const siblings = parent.children;
    const currentIndex = siblings.findIndex(child => child.id === nodeId);
    let newIndex;

    if (direction === 'left') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : siblings.length - 1;
    } else {
      newIndex = (currentIndex + 1) % siblings.length;
    }

    const newNode = siblings[newIndex];
    selectNodeAndDescendants(newNode);
  };

  /**
   * Selects a node and its descendants.
   * @param {Object} node - The node to select.
   */
  const selectNodeAndDescendants = (node) => {
    if (node.children.length === 0) {
      handleNodeSelect(node);
    } else {
      selectNodeAndDescendants(node.children[0]);
    }
  };


  /**
   * Renders the path from the root to the selected node as a vertical list.
   * @param {Object} props - The component props.
   * @param {Array} props.path - The array of nodes representing the path.
   * @param {Object} props.tree - The entire conversation tree.
   * @param {Function} props.onRegenerate - Function to handle regeneration.
   * @param {Function} props.onEdit - Function to handle editing.
   * @param {Function} props.onNavigateSibling - Function to handle sibling navigation.
   * @param {boolean} props.scrollToBottom - Whether to scroll to the bottom of the path.
   * @returns {JSX.Element} The JSX element displaying the path.
   */
  const Path = React.memo(({ path, tree, onRegenerate, onEdit, onNavigateSibling, scrollToBottom }) => {
    const containerRef = useRef(null);

    useEffect(() => {
      if (scrollToBottom && containerRef.current) {
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      }
    }, [path, scrollToBottom]);

    if (!path) return <p>No path found.</p>;

    const pathItems = path.map(pathNode => {
      const node = findNodeById(tree, pathNode.id);
      const parent = findParent(tree, pathNode.id);
      const hasSiblings = parent ? parent.children.length > 1 : false;
      
      return (
        <PathItem
          key={pathNode.id}
          id={pathNode.id}
          sender={pathNode.role === 'user' ? 'user' : 'ai'}
          content={pathNode.content}
          onRegenerate={onRegenerate}
          onEdit={onEdit}
          onNavigateSibling={onNavigateSibling}
          hasSiblings={hasSiblings}
        />
      );
    });

    return (
      <div
        ref={containerRef}
        style={{
          border: '1px solid #ccc',
          borderRadius: '5px',
          padding: '15px',
          marginTop: '20px',
          width: '600px',
          height: '1000px',
          overflowY: 'auto'
        }}
      >
        <h3>Path:</h3>
        {pathItems}
      </div>
    );
  });



  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <TreeView 
          tree={tree}
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
        />
        <div style={{ marginTop: '10px' }}>
          <button onClick={() => addDeepenNode(selectedNode)} disabled={selectedNode.children.length > 0}>DEEPEN</button>
          <button onClick={() => addBroadenNode(selectedNode)} disabled={selectedNode.id === 0}>BROADEN</button>
        </div>
        <div style={{ marginTop: '10px' }}>
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            style={{ marginRight: '10px' }}
            disabled={isInputDisabled}
          />
          <button onClick={handleSubmit} disabled={isInputDisabled}>Send</button>
        </div>
      </div>
      <Path 
        path={path}
        tree={tree}
        onRegenerate={handleRegenerate}
        onEdit={handleEdit}
        onNavigateSibling={navigateToSibling}
        scrollToBottom={shouldScrollToBottom}
      />
    </div>
  );
}

export default App;