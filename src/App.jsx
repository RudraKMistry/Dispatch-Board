import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Calendar, FileText, X, LogOut, ArrowRight, ArrowLeft, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Login from './Login';
import { supabase } from './supabaseClient';



const BoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const TransportCard = ({ transport, index, onDragStart, onNoteChange, onStatusChange, onRequestReverse }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Package size={18} />;
      case 'ongoing': return <Truck size={18} />;
      case 'completed': return <CheckCircle size={18} />;
      default: return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Dispatch';
      case 'ongoing': return 'In Process';
      case 'completed': return 'Completed';
      default: return '';
    }
  };

  const formattedDate = format(parseISO(transport.date), 'MMM d, yyyy');

  const nextStatusMap = {
    pending: 'ongoing',
    ongoing: 'completed',
    completed: null
  };
  const nextStatus = nextStatusMap[transport.status];

  const prevStatusMap = {
    pending: null,
    ongoing: 'pending',
    completed: 'ongoing'
  };
  const prevStatus = prevStatusMap[transport.status];

  const handleReverse = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onRequestReverse(transport.id, prevStatus, getStatusText(prevStatus));
  };

  return (
    <div 
      className="transport-card"
      draggable
      onDragStart={(e) => onDragStart(e, transport.id)}
      style={{ cursor: 'grab' }}
    >
      <div className="card-header">
        <div className="shipment-id">
          <span style={{ color: 'var(--text-secondary)', marginRight: '4px', fontSize: '0.9rem' }}>#{index + 1}</span>
          {getStatusIcon(transport.status)}
          {transport.displayId}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`status-chip ${transport.status}`}>
            {getStatusText(transport.status)}
          </span>
          {prevStatus && (
            <button 
              onClick={handleReverse}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              title={`Revert to ${getStatusText(prevStatus)}`}
            >
              <ArrowLeft size={14} />
            </button>
          )}
          {nextStatus && (
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onStatusChange(transport.id, nextStatus); }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}
              title={`Move to ${getStatusText(nextStatus)}`}
            >
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="card-body">
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>To: {transport.companyName}</span>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>{transport.productName}</div>
        </div>
        
        <div className="note-section" onMouseDown={(e) => e.stopPropagation()}>
          <FileText size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
          <input 
            type="text" 
            className="note-input"
            value={transport.note || ''}
            onChange={(e) => onNoteChange(transport.id, e.target.value)}
            placeholder="Add a note..."
          />
        </div>

        <div className="meta-info">
          <div className="meta-item">
            <Calendar />
            <span>{formattedDate}</span>
          </div>
          <div className="meta-item" style={{ marginLeft: 'auto', color: 'var(--accent-primary)' }}>
            <Calendar />
            <span>Due: {transport.dueDate ? format(parseISO(transport.dueDate), 'MMM d, yyyy') : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [transports, setTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmReverse, setConfirmReverse] = useState({ show: false, id: null, prevStatus: null, prevStatusText: null });
  const [collapsedSections, setCollapsedSections] = useState({ pending: false, ongoing: false, completed: false });
  const [newTransport, setNewTransport] = useState({
    id: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
    displayId: '',
    productName: '',
    companyName: '',
    dueDate: '',
    date: new Date().toISOString().split('T')[0]
  });

  const navigate = useNavigate();

  // Fetch from Supabase
  useEffect(() => {
    const fetchTransports = async () => {
      const { data, error } = await supabase.from('transports').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Supabase error:', error);
      } else {
        const mapped = data.map(d => ({
          ...d,
          displayId: d.display_id,
          productName: d.product_name,
          companyName: d.company_name,
          dueDate: d.due_date
        }));
        setTransports(mapped);
      }
      setLoading(false);
    };

    fetchTransports();

    // Subscribe to realtime changes
    const channel = supabase.channel('transports-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transports' }, fetchTransports)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const pending = transports.filter(t => t.status === 'pending');
  const ongoing = transports.filter(t => t.status === 'ongoing');
  const completed = transports.filter(t => t.status === 'completed');

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('transportId', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('transportId');
    if (!id) return;
    
    // Optimistic UI update
    setTransports(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status };
      }
      return t;
    }));

    // Update Supabase
    await supabase.from('transports').update({ status }).eq('id', id);
  };

  const handleStatusChange = async (id, status) => {
    // Optimistic UI update
    setTransports(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status };
      }
      return t;
    }));
    
    // Update Supabase
    await supabase.from('transports').update({ status }).eq('id', id);
  };

  const handleRequestReverse = (id, prevStatus, prevStatusText) => {
    setConfirmReverse({ show: true, id, prevStatus, prevStatusText });
  };

  const confirmReverseAction = () => {
    handleStatusChange(confirmReverse.id, confirmReverse.prevStatus);
    setConfirmReverse({ show: false, id: null, prevStatus: null, prevStatusText: null });
  };

  const handleNoteChange = async (id, newNote) => {
    // Optimistic update
    setTransports(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, note: newNote };
      }
      return t;
    }));

    // Update Supabase
    await supabase.from('transports').update({ note: newNote }).eq('id', id);
  };

  const handleCreateTransport = async (e) => {
    e.preventDefault();
    const dateObj = new Date(newTransport.date);
    
    const transportToInsert = {
      display_id: newTransport.displayId,
      product_name: newTransport.productName,
      status: 'pending',
      company_name: newTransport.companyName,
      due_date: newTransport.dueDate ? new Date(newTransport.dueDate).toISOString() : null,
      date: dateObj.toISOString(),
      driver: 'Unassigned',
      note: ''
    };

    const { data, error } = await supabase.from('transports').insert([transportToInsert]).select();
    
    if (error) {
      console.error('Error creating transport:', error);
      alert('Failed to create transport.');
    } else if (data && data.length > 0) {
      const inserted = data[0];
      setTransports(prev => [{
        ...inserted,
        displayId: inserted.display_id,
        productName: inserted.product_name,
        companyName: inserted.company_name,
        dueDate: inserted.due_date
      }, ...prev]);
    }
    
    setIsModalOpen(false);
    setNewTransport({
      id: '',
      displayId: '',
      productName: '',
      companyName: '',
      dueDate: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleExport = () => {
    if (transports.length === 0) return alert("No data to export!");

    // Export PDF
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Dispatch Board Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Summary: ${pending.length} Pending | ${ongoing.length} Ongoing | ${completed.length} Completed`, 14, 36);

    const tableData = transports.map(t => [t.id, t.displayId || '', t.productName || '', t.status.toUpperCase(), t.origin, t.destination, format(parseISO(t.date), 'MMM d, yyyy')]);

    autoTable(doc, {
      startY: 45,
      head: [['System ID', 'Custom ID', 'Product', 'Status', 'Origin', 'Destination', 'Date']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Dispatch_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dispatch Board</h1>
          <p className="dashboard-subtitle">Monitor the live status of all goods shipments across the fleet.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
           <button 
             onClick={handleExport}
             style={{
               backgroundColor: 'var(--bg-surface)', 
               border: '1px solid var(--border-color)',
               padding: '0.5rem 1rem',
               borderRadius: 'var(--radius-md)',
               fontWeight: 500,
               cursor: 'pointer',
               boxShadow: 'var(--shadow-sm)'
             }}>
             Export Report
           </button>
           <button 
             onClick={() => setIsModalOpen(true)}
             style={{
               backgroundColor: 'var(--accent-primary)', 
               color: 'white',
               border: 'none',
               padding: '0.5rem 1rem',
               borderRadius: 'var(--radius-md)',
               fontWeight: 500,
               cursor: 'pointer',
               boxShadow: 'var(--shadow-sm)'
             }}>
             + New Transport
           </button>
           <div className="header-divider" style={{ width: '1px', height: '32px', backgroundColor: 'var(--border-color)', margin: '0 0.5rem' }}></div>
           <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.5rem' }}>
             <LogOut size={20} />
             <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>Logout</span>
           </button>
        </div>
      </div>

      <div className="board">
        {/* Dispatch Column */}
        <div className="column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'pending')}>
          <div className="column-header pending" onClick={() => toggleSection('pending')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Package size={20} color="var(--status-pending-text)" />
              <span>Dispatch</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge">{pending.length}</span>
              {collapsedSections.pending ? <ChevronRight size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
            </div>
          </div>
          {!collapsedSections.pending && (
            <div className="card-list" style={{ minHeight: '300px', paddingBottom: '2rem' }}>
              {pending.map((transport, index) => (
                <TransportCard key={transport.id} transport={transport} index={index} onDragStart={handleDragStart} onNoteChange={handleNoteChange} onStatusChange={handleStatusChange} onRequestReverse={handleRequestReverse} />
              ))}
            </div>
          )}
        </div>

        {/* Ongoing Column */}
        <div className="column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'ongoing')}>
          <div className="column-header ongoing" onClick={() => toggleSection('ongoing')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={20} color="var(--status-ongoing-text)" />
              <span>In process/ On going</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge">{ongoing.length}</span>
              {collapsedSections.ongoing ? <ChevronRight size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
            </div>
          </div>
          {!collapsedSections.ongoing && (
            <div className="card-list" style={{ minHeight: '300px', paddingBottom: '2rem' }}>
              {ongoing.map((transport, index) => (
                <TransportCard key={transport.id} transport={transport} index={index} onDragStart={handleDragStart} onNoteChange={handleNoteChange} onStatusChange={handleStatusChange} onRequestReverse={handleRequestReverse} />
              ))}
            </div>
          )}
        </div>

        {/* Completed Column */}
        <div className="column" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'completed')}>
          <div className="column-header completed" onClick={() => toggleSection('completed')} style={{ cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={20} color="var(--status-completed-text)" />
              <span>Completed/Dispatched</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="badge">{completed.length}</span>
              {collapsedSections.completed ? <ChevronRight size={20} color="var(--text-secondary)" /> : <ChevronDown size={20} color="var(--text-secondary)" />}
            </div>
          </div>
          {!collapsedSections.completed && (
            <div className="card-list" style={{ minHeight: '300px', paddingBottom: '2rem' }}>
              {completed.map((transport, index) => (
                <TransportCard key={transport.id} transport={transport} index={index} onDragStart={handleDragStart} onNoteChange={handleNoteChange} onStatusChange={handleStatusChange} onRequestReverse={handleRequestReverse} />
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Create New Transport</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="var(--text-secondary)" />
              </button>
            </div>
            <form onSubmit={handleCreateTransport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div><label>Custom ID / Tracking Number</label><input required type="text" value={newTransport.displayId} onChange={e => setNewTransport({...newTransport, displayId: e.target.value})} placeholder="e.g. ORD-12345" /></div>
              <div><label>Company Name</label><input required type="text" value={newTransport.companyName} onChange={e => setNewTransport({...newTransport, companyName: e.target.value})} placeholder="e.g. Acme Corp" /></div>
              <div><label>Product Name</label><input required type="text" value={newTransport.productName} onChange={e => setNewTransport({...newTransport, productName: e.target.value})} placeholder="e.g. Gaming Laptops" /></div>
              <div><label>Due Date</label><input required type="date" value={newTransport.dueDate} onChange={e => setNewTransport({...newTransport, dueDate: e.target.value})} /></div>
              <div><label>Date Placed</label><input required type="date" value={newTransport.date} onChange={e => setNewTransport({...newTransport, date: e.target.value})} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Transport</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmReverse.show && (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ background: '#FEF2F2', padding: '1rem', borderRadius: '50%' }}>
                <AlertTriangle size={32} color="#EF4444" />
              </div>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Reverse Transport?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Are you sure you want to revert this transport back to <strong style={{ color: 'var(--text-primary)' }}>{confirmReverse.prevStatusText}</strong>? This will update the tracking status for all users.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setConfirmReverse({ show: false, id: null, prevStatus: null, prevStatusText: null })}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={confirmReverseAction}
                style={{ flex: 1, backgroundColor: '#EF4444', borderColor: '#EF4444' }}
              >
                Yes, Revert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
