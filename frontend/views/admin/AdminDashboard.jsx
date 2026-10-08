import React from 'react';
import {useAdminMetrics,MetricsPanel,MetricCards} from './AdminMetrics.jsx';
import {duration} from '../../TicketInsights.jsx';
export default function AdminDashboard(){const metrics=useAdminMetrics(),d=metrics.data;return <MetricsPanel metrics={metrics}>{d&&<><MetricCards items={[["Total tickets",d.total],["Awaiting response",d.awaiting_response],["Average response",duration(d.average_response_seconds)],["Average resolution",duration(d.average_resolution_seconds)]]}/></>}</MetricsPanel>;}
