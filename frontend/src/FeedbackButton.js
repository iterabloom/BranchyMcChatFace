import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { fabric } from 'fabric';
import axios from 'axios';

const FeedbackButton = ({ getLocalState }) => {
  const [showModal, setShowModal] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);

  const captureScreenshot = () => {
    html2canvas(document.body).then(canvas => {
      setScreenshot(canvas.toDataURL());
      setShowModal(true);
      setTimeout(() => initFabric(canvas.toDataURL()), 0);
    });
  };

  const initFabric = (imageUrl) => {
    fabricCanvasRef.current = new fabric.Canvas(canvasRef.current, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    fabric.Image.fromURL(imageUrl, (img) => {
      img.scaleToWidth(fabricCanvasRef.current.width);
      fabricCanvasRef.current.setBackgroundImage(img, fabricCanvasRef.current.renderAll.bind(fabricCanvasRef.current));
    });
  };

  const addText = () => {
    const text = new fabric.IText('Type here', {
      left: 50,
      top: 50,
      fontFamily: 'Arial',
      fill: '#ff0000',
      fontSize: 20
    });
    fabricCanvasRef.current.add(text);
  };

  const addArrow = () => {
    const arrow = new fabric.Path('M 0 0 L 200 100', {
      stroke: 'red',
      strokeWidth: 2,
      left: 50,
      top: 50
    });
    fabricCanvasRef.current.add(arrow);
  };

  const submitFeedback = async () => {
    const annotatedScreenshot = fabricCanvasRef.current.toDataURL();
    const localState = getLocalState();
    
    try {
      await axios.post('http://localhost:8000/feedback', {
        screenshot: annotatedScreenshot,
        localState: JSON.stringify(localState)
      });
      alert('Feedback submitted successfully!');
      setShowModal(false);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  return (
    <>
      <button
        className="feedback-button"
        onClick={captureScreenshot}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          opacity: 0,
          transition: 'opacity 0.3s'
        }}
        onMouseEnter={(e) => e.target.style.opacity = 1}
        onMouseLeave={(e) => e.target.style.opacity = 0}
      >
        Feedback
      </button>
      {showModal && (
        <div className="modal" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="modal-content" style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '5px'
          }}>
            <canvas ref={canvasRef} />
            <div>
              <button onClick={addText}>Add Text</button>
              <button onClick={addArrow}>Add Arrow</button>
              <button onClick={submitFeedback}>Submit Feedback</button>
              <button onClick={() => setShowModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;

