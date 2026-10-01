import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Calendar, FileText, X, LogOut, ArrowRight, ArrowLeft, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import Login from './Login';
import { supabase } from './supabaseClient';



const BoxIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
);

const TransportCard = ({ transport, index, onDragStart, onNoteChange, onProductChange, onStatusChange, onRequestReverse, onClick }) => {
  const [newProductItem, setNewProductItem] = useState('');

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

  const productsList = transport.productName ? transport.productName.split('\n').filter(Boolean) : [];

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProductItem.trim()) return;
    const updated = [...productsList, '[ ] ' + newProductItem.trim()].join('\n');
    onProductChange(transport.id, updated);
    setNewProductItem('');
  };

  const handleRemoveProduct = (i, e) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = productsList.filter((_, idx) => idx !== i).join('\n');
    onProductChange(transport.id, updated);
  };

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div 
      className={`transport-card ${transport.status}`}
      draggable={!isMobile}
      onDragStart={(e) => {
        if (isMobile) {
          e.preventDefault();
          return;
        }
        onDragStart(e, transport.id);
      }}
      onClick={onClick}
      style={{ '--animation-order': index, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}
    >
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', margin: 0, padding: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1.1rem', maxWidth: '65%', lineHeight: 1.2 }}>
          To: {transport.companyName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
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
      
      <div className="card-body" style={{ margin: 0, padding: 0 }}>
        
        {productsList.length > 0 && (
          <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem' }}>
            <div style={{ fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
               <Package size={14} />
               Products ({productsList.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {productsList.map((prod, i) => {
                const cleanName = prod.replace(/^\[[x ]\] /, '');
                const isChecked = prod.startsWith('[x] ');
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isChecked ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isChecked ? 'line-through' : 'none' }}>
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor' }} />
                    <span>{cleanName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {transport.note && transport.note.trim() && (
          <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
               <FileText size={14} />
               Note
            </div>
            <div style={{ color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {transport.note}
            </div>
          </div>
        )}

        <div className="meta-info" style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="meta-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
          <div className="meta-item" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontWeight: 500, fontSize: '0.85rem' }}>
            <Calendar size={14} />
            <span>Due: {transport.dueDate ? format(parseISO(transport.dueDate), 'MMM d, yyyy') : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const TransportDetailsModal = ({ transport, onClose, onNoteChange, onProductChange, pdfMap, setPdfMap }) => {
  const productsList = transport.productName ? transport.productName.split('\n').filter(Boolean) : [];
  const [newProductItem, setNewProductItem] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 400); // Wait for the reverse animation to complete
  };

  useEffect(() => {
    // Prevent background scrolling and layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, []);

  const handleToggleCheck = (i) => {
    const updated = [...productsList];
    const item = updated[i];
    if (item.startsWith('[x] ')) {
      updated[i] = item.replace('[x] ', '[ ] ');
    } else if (item.startsWith('[ ] ')) {
      updated[i] = item.replace('[ ] ', '[x] ');
    } else {
      updated[i] = '[x] ' + item;
    }
    onProductChange(transport.id, updated.join('\n'));
  };

  const handleAddProduct = (e) => {
    e.preventDefault();
    if (!newProductItem.trim()) return;
    const updated = [...productsList, '[ ] ' + newProductItem.trim()].join('\n');
    onProductChange(transport.id, updated);
    setNewProductItem('');
  };

  const handleRemoveProduct = (i) => {
    const updated = productsList.filter((_, idx) => idx !== i).join('\n');
    onProductChange(transport.id, updated);
  };

  const handlePdfUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfMap(prev => ({ ...prev, [transport.id]: URL.createObjectURL(file) }));
    }
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'overlay-reverse' : ''}`} onClick={handleClose} style={{ zIndex: 100 }}>
      <div className={`modal-content modal-anim${isClosing ? '-reverse' : ''}`} onClick={e => e.stopPropagation()} style={{ width: '95%', maxWidth: '1400px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>To: {transport.companyName}</h2>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="var(--text-secondary)" />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', gap: '2rem', flexGrow: 1, overflow: 'hidden' }}>
          
          <div className="modal-left-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Products Checklist</h3>
              <div style={{ backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '1rem' }}>
                <ul style={{ listStyleType: 'none', padding: 0, margin: '0 0 1rem 0' }}>
                  {productsList.map((prod, i) => {
                    const isChecked = prod.startsWith('[x] ');
                    const cleanName = prod.replace(/^\[[x ]\] /, '');
                    return (
                      <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px dashed var(--border-color)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', width: '100%' }}>
                          <input type="checkbox" checked={isChecked} onChange={() => handleToggleCheck(i)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                          <span className={`checklist-text ${isChecked ? 'checked' : ''}`}>{cleanName}</span>
                        </label>
                        <button onClick={() => handleRemoveProduct(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={14} /></button>
                      </li>
                    );
                  })}
                  {productsList.length === 0 && <li style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No products added</li>}
                </ul>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text"
                    value={newProductItem}
                    onChange={(e) => setNewProductItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProduct(e)}
                    placeholder="Add a new product to list..."
                    style={{ flexGrow: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', outline: 'none' }}
                  />
                  <button onClick={handleAddProduct} className="btn-primary" style={{ padding: '0 1rem' }}>Add</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Detailed Notes</h3>
              <textarea 
                value={transport.note || ''}
                onChange={(e) => onNoteChange(transport.id, e.target.value)}
                placeholder="Add detailed notes here..."
                style={{ flexGrow: 1, minHeight: '150px', padding: '1rem', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          <div className="modal-right-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', paddingLeft: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Attached Document (PDF)</h3>
              <label className="btn-secondary" style={{ cursor: 'pointer' }}>
                <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
                Upload PDF
              </label>
            </div>
            
            <div style={{ flexGrow: 1, backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pdfMap[transport.id] ? (
                <iframe src={pdfMap[transport.id]} width="100%" height="100%" style={{ border: 'none' }} title="PDF Viewer" />
              ) : (
                <div style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
                  <FileText size={48} style={{ opacity: 0.5, marginBottom: '1rem', margin: '0 auto' }} />
                  <p>No PDF uploaded for this transport.</p>
                </div>
              )}
            </div>
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
  const [selectedCardId, setSelectedCardId] = useState(null);
  const selectedCard = transports.find(t => t.id === selectedCardId);
  const [pdfMap, setPdfMap] = useState({});
  const [confirmReverse, setConfirmReverse] = useState({ show: false, id: null, prevStatus: null, prevStatusText: null });
  const [collapsedSections, setCollapsedSections] = useState({ pending: false, ongoing: false, completed: false });
  const [newTransport, setNewTransport] = useState({
    id: `TRP-${Math.floor(1000 + Math.random() * 9000)}`,
    displayId: '',
    products: [''],
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
    
    const transport = transports.find(t => t.id === id);
    if (!transport || transport.status === status) return;
    
    const statusOrder = { pending: 1, ongoing: 2, completed: 3 };
    
    if (statusOrder[status] < statusOrder[transport.status]) {
      // Reverse Flow
      const prevStatusTextMap = { pending: 'Dispatch', ongoing: 'In Process' };
      handleRequestReverse(id, status, prevStatusTextMap[status]);
      return;
    }
    
    // Normal Forward Flow - Optimistic UI update
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

  const handleProductChange = async (id, newProducts) => {
    // Optimistic update
    setTransports(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, productName: newProducts };
      }
      return t;
    }));

    // Update Supabase (productName maps to product_name)
    await supabase.from('transports').update({ product_name: newProducts }).eq('id', id);
  };

  const handleCreateTransport = async (e) => {
    e.preventDefault();
    const dateObj = new Date(newTransport.date);
    
    const transportToInsert = {
      display_id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      product_name: newTransport.products.filter(p => p.trim()).map(p => `[ ] ${p.trim()}`).join('\n'),
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
      products: [''],
      companyName: '',
      dueDate: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handleExportPDF = () => {
    if (transports.length === 0) return alert("No data to export!");

    // Export PDF
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Dispatch Board Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Summary: ${pending.length} Pending | ${ongoing.length} Ongoing | ${completed.length} Completed`, 14, 36);

    const tableData = transports.map(t => [
      t.companyName || '',
      t.productName ? t.productName.replace(/\[ \]\s*/g, '').replace(/\n/g, ', ') : '',
      t.status.toUpperCase(),
      t.dueDate ? format(parseISO(t.dueDate), 'MMM d, yyyy') : 'N/A',
      t.date ? format(parseISO(t.date), 'MMM d, yyyy') : 'N/A',
      t.note || ''
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Company Name', 'Products', 'Status', 'Due Date', 'Placed Date', 'Notes']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Dispatch_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleExportExcel = () => {
    if (transports.length === 0) return alert("No data to export!");
    
    const formattedData = transports.map(t => ({
      'Company Name': t.companyName || '',
      'Products': t.productName ? t.productName.replace(/\[ \]\s*/g, '').replace(/\n/g, ', ') : '',
      'Status': t.status.toUpperCase(),
      'Due Date': t.dueDate ? format(parseISO(t.dueDate), 'MMM d, yyyy') : 'N/A',
      'Placed Date': t.date ? format(parseISO(t.date), 'MMM d, yyyy') : 'N/A',
      'Notes': t.note || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transports');
    XLSX.writeFile(workbook, `Dispatch_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
           <button onClick={handleExportPDF} className="btn-secondary">
             Export PDF
           </button>
           <button onClick={handleExportExcel} className="btn-secondary">
             Export Excel
           </button>
           <button onClick={() => setIsModalOpen(true)} className="btn-primary">
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
                <TransportCard key={transport.id} transport={transport} index={index} onDragStart={handleDragStart} onNoteChange={handleNoteChange} onProductChange={handleProductChange} onStatusChange={handleStatusChange} onRequestReverse={handleRequestReverse} onClick={() => setSelectedCardId(transport.id)} />
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
                <TransportCard key={transport.id} transport={transport} index={index} onDragStart={handleDragStart} onNoteChange={handleNoteChange} onProductChange={handleProductChange} onStatusChange={handleStatusChange} onRequestReverse={handleRequestReverse} onClick={() => setSelectedCardId(transport.id)} />
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
                <TransportCard key={transport.id} transport={transport} index={index} onDragStart={handleDragStart} onNoteChange={handleNoteChange} onProductChange={handleProductChange} onStatusChange={handleStatusChange} onRequestReverse={handleRequestReverse} onClick={() => setSelectedCardId(transport.id)} />
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
              <div><label>Company Name</label><input required type="text" value={newTransport.companyName} onChange={e => setNewTransport({...newTransport, companyName: e.target.value})} placeholder="e.g. Acme Corp" /></div>
              
              <div>
                <label>Products Checklist</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: 'var(--bg-input)', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  {newTransport.products.map((prod, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        value={prod} 
                        onChange={e => {
                          const newProducts = [...newTransport.products];
                          newProducts[index] = e.target.value;
                          setNewTransport({...newTransport, products: newProducts});
                        }} 
                        placeholder="e.g. Gaming Laptops" 
                        style={{ flexGrow: 1, backgroundColor: 'var(--bg-surface)' }}
                        required={index === 0 && newTransport.products.length === 1}
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const newProducts = newTransport.products.filter((_, i) => i !== index);
                          setNewTransport({...newTransport, products: newProducts.length ? newProducts : ['']});
                        }} 
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0 0.5rem' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => setNewTransport({...newTransport, products: [...newTransport.products, '']})}
                    style={{ backgroundColor: 'var(--accent-primary)', color: '#000', border: 'none', borderRadius: '4px', padding: '0.5rem', cursor: 'pointer', fontWeight: 500, alignSelf: 'flex-start', fontSize: '0.85rem' }}
                  >
                    Add Product
                  </button>
                </div>
              </div>
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

      {selectedCard && (
        <TransportDetailsModal 
          transport={selectedCard} 
          onClose={() => setSelectedCardId(null)}
          onNoteChange={handleNoteChange}
          onProductChange={handleProductChange}
          pdfMap={pdfMap}
          setPdfMap={setPdfMap}
        />
      )}
    </div>
  );
};

const ProtectedRoute = ({ session, children }) => {
  return session ? children : <Navigate to="/login" replace />;
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Purge legacy mock authentication data
    localStorage.removeItem('mockUsers');
    localStorage.removeItem('isAuthenticated');

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute session={session}>
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
