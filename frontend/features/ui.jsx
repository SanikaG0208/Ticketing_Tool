import React from 'react';
import {exactTime} from '../TicketTimeline.jsx';
export const Icon = ({ name }) => <span className="icon" aria-hidden="true">{{ tickets: '▤', users: '♙', department: '▦', types: '◇', plus: '+', search: '⌕', arrow: '↗' }[name]}</span>;
export const ticketNumber = number => 'TKT' + String(number).padStart(2, '0');
export const TableTime = ({ value }) => value ? <time className="table-time" dateTime={value} title={exactTime(value)}><span>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(value))}</span><small>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date(value))} IST</small></time> : <span className="time-empty">—</span>;
export const Badge = ({ value }) => <span className={`badge ${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>;
