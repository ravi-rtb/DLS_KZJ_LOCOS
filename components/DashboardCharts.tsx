import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAllFailures, parseDateDDMMYY } from '../services/googleSheetService';
import type { TractionFailure } from '../types';
import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import FailureDetailsModal from './FailureDetailsModal';

// --- Helper Functions ---

const getFinancialYear = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-11
  return month >= 3 ? `${year}-${(year + 1).toString().slice(-2)}` : `${year - 1}-${year.toString().slice(-2)}`;
};

const CHART_COLORS = [
    '#3B82F6', // Blue 500
    '#10B981', // Emerald 500
    '#F59E0B', // Amber 500
    '#8B5CF6', // Violet 500
    '#06B6D4', // Cyan 500
    '#F97316', // Orange 500
    '#EC4899', // Pink 500
    '#84CC16', // Lime 500
    '#6366F1', // Indigo 500
    '#D97706', // Amber 600
    '#059669', // Emerald 600
    '#7C3AED', // Violet 600
    '#EAB308', // Yellow 500
    '#F43F5E', // Rose 500
];
const OTH_COLOR = '#DC2626'; // Red 600
const getColor = (index: number) => CHART_COLORS[index % CHART_COLORS.length];

const getContrastingTextColor = (hexcolor: string): string => {
    if (hexcolor.slice(0, 1) === '#') {
        hexcolor = hexcolor.slice(1);
    }
    const r = parseInt(hexcolor.substr(0, 2), 16);
    const g = parseInt(hexcolor.substr(2, 2), 16);
    const b = parseInt(hexcolor.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#1e293b' : '#ffffff'; // Using theme text colors
};

const createShadedPattern = (color: string) => {
    // Check if we're in a browser environment
    if (typeof document === 'undefined') return color;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return color; // Fallback

    const size = 10;
    canvas.width = size;
    canvas.height = size;
    
    // Set the background color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    // Add a semi-transparent overlay to make the lines stand out more
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, size, size);

    // Draw the diagonal lines
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size, 0);
    ctx.stroke();
    
    return ctx.createPattern(canvas, 'repeat') ?? color;
};

const pieChartLabelsPlugin = {
  id: 'pieChartLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx, data } = chart;
    ctx.save();
    
    data.datasets.forEach((dataset: any, i: number) => {
      const meta = chart.getDatasetMeta(i);
      if (!meta.hidden && meta.type === 'pie') {
        meta.data.forEach((element: any, index: number) => {
          const { x, y, startAngle, endAngle, outerRadius } = element;
          
          const angle = startAngle + (endAngle - startAngle) / 2;
          
          // Hide label for slices smaller than ~20 degrees to prevent clutter
          if (endAngle - startAngle < 0.35) { 
            return;
          }
          
          const label = data.labels[index];
          const value = dataset.data[index];
          const text = `${label} (${value})`;

          // Position the text inside the slice
          const textX = x + Math.cos(angle) * (outerRadius * 0.65);
          const textY = y + Math.sin(angle) * (outerRadius * 0.65);

          const bgColor = dataset.backgroundColor[index];
          ctx.fillStyle = getContrastingTextColor(bgColor);
          
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.fillText(text, textX, textY);
        });
      }
    });
    ctx.restore();
  }
};

const barChartTotalLabelsPlugin = {
  id: 'barChartTotalLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    ctx.save();
    
    chart.getDatasetMeta(0).data.forEach((datapoint: any, index: number) => {
      const yPos = datapoint.y;
      
      let total = 0;
      chart.data.datasets.forEach((dataset: any) => {
        const value = dataset.data[index];
        if (value > 0) {
          total += value;
        }
      });

      if (total > 0) {
        const xPos = chart.scales.x.getPixelForValue(total) + 5;
        
        if (xPos < chart.chartArea.right - 15) { 
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = '#475569'; 
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(total, xPos, yPos);
        }
      }
    });
    
    ctx.restore();
  }
};

const formatTooltipLocos = (locos: string[]): string[] => {
    if (!locos || locos.length === 0) return [];
    
    const lines: string[] = [];
    const maxLineLength = 40;
    let currentLine = 'locos: ';
    
    locos.forEach((loco) => {
        if (currentLine.length + loco.length + 2 > maxLineLength) {
            lines.push(currentLine.slice(0, -2)); // remove trailing ', '
            currentLine = `  ${loco}, `;
        } else {
            currentLine += `${loco}, `;
        }
    });
    lines.push(currentLine.slice(0, -2));
    return lines;
};

const DashboardCharts = () => {
  const [failures, setFailures] = useState<TractionFailure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalFailures, setModalFailures] = useState<TractionFailure[] | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Chart 1 state
  const [investigationToggle, setInvestigationToggle] = useState<'P' | 'Y'>('P');
  const [pieChartFilter, setPieChartFilter] = useState<'all' | 'icms'>('icms');
  const chart1Ref = useRef<HTMLCanvasElement>(null);
  const chart1InstanceRef = useRef<any>(null);

  // Chart 2 state
  const [icmsToggle, setIcmsToggle] = useState<'shed' | 'elocos'>('shed');
  const [responsibilityFilter, setResponsibilityFilter] = useState<'all' | 'loco'>('loco');
  const chart2Ref = useRef<HTMLCanvasElement>(null);
  const chart2InstanceRef = useRef<any>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Set initial value
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAllFailures();
        setFailures(data);
      } catch (err)
 {
        setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching chart data.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const currentFyFailures = useMemo(() => {
    return failures.filter(f => {
      const date = parseDateDDMMYY(f.datefailed);
      return date && getFinancialYear(date) === '2025-26';
    });
  }, [failures]);
  
  const { pendingFailures, yetToArriveFailures } = useMemo(() => {
    let baseFiltered = currentFyFailures.filter(f => f.icmsmessage?.toUpperCase() !== '');

    if (pieChartFilter === 'icms') {
        baseFiltered = baseFiltered.filter(f => f.icmsmessage?.toUpperCase() !== 'MESSAGE');
    }

    return {
        pendingFailures: baseFiltered.filter(f => f.investigationstatus?.toUpperCase() === 'P'),
        yetToArriveFailures: baseFiltered.filter(f => f.investigationstatus?.toUpperCase() === 'Y'),
    };
  }, [currentFyFailures, pieChartFilter]);

  const investigationChartData = useMemo(() => {
    const failuresToDisplay = investigationToggle === 'P' ? pendingFailures : yetToArriveFailures;
    
    const dataByResponsibility = failuresToDisplay.reduce((acc, f) => {
        const key = f.responsibility || 'Uncategorized';
        if (!acc[key]) {
            acc[key] = { count: 0, locos: [], items: [] };
        }
        acc[key].count++;
        acc[key].items.push(f);
        if (f.locono && !acc[key].locos.includes(f.locono)) {
            acc[key].locos.push(f.locono);
        }
        return acc;
    }, {} as Record<string, { count: number; locos: string[]; items: TractionFailure[] }>);

    const labels = Object.keys(dataByResponsibility);
    const data = labels.map(label => dataByResponsibility[label].count);
    
    return { dataByResponsibility, labels, data };
  }, [investigationToggle, pendingFailures, yetToArriveFailures]);

  useEffect(() => {
    if (!chart1Ref.current || !(window as any).Chart) return;

    if (chart1InstanceRef.current) {
        chart1InstanceRef.current.destroy();
    }
    
    const { dataByResponsibility, labels, data } = investigationChartData;
    const ctx = chart1Ref.current.getContext('2d');
    if (!ctx) return;

    if (data.length === 0) {
        ctx.clearRect(0, 0, chart1Ref.current.width, chart1Ref.current.height);
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.fillText("No data for this selection", chart1Ref.current.width / 2, chart1Ref.current.height / 2);
        return;
    }

    let colorIndex = 0;
    const backgroundColors = labels.map(label => {
        if (label.toUpperCase() === 'OTH') {
            return OTH_COLOR;
        }
        return getColor(colorIndex++);
    });
    
    chart1InstanceRef.current = new (window as any).Chart(ctx, {
      type: 'pie',
      data: {
          labels,
          datasets: [{
              label: 'Failures',
              data,
              backgroundColor: backgroundColors,
              hoverOffset: 4
          }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (evt) => {
          const points = chart1InstanceRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
          if (points.length) {
            const firstPoint = points[0];
            const label = chart1InstanceRef.current.data.labels[firstPoint.index];
            const failuresToShow = dataByResponsibility[label]?.items;
            if (failuresToShow) {
              setModalFailures(failuresToShow);
            }
          }
        },
        onHover: (event: any, chartElement: any[]) => {
            event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
        },
        plugins: {
          legend: { 
            position: isMobile ? 'bottom' : 'top',
            labels: {
                padding: isMobile ? 20 : 10,
            }
          },
          title: { display: false },
          tooltip: {
            callbacks: {
              label: function(context: any) {
                const label = context.label || '';
                const count = context.raw as number;
                const locoData = dataByResponsibility[label];
                
                const title = `${label} (${count})`;
                let lines = [title];
                
                if (locoData && locoData.locos.length > 0) {
                    lines = lines.concat(formatTooltipLocos(locoData.locos));
                }
                return lines;
              }
            }
          }
        }
      },
      plugins: [pieChartLabelsPlugin]
    });
  }, [investigationChartData, isMobile]);

  const icmsChartData = useMemo(() => {
    const baseFiltered = currentFyFailures.filter(f => {
        if (icmsToggle === 'shed') {
            return f.icmsmessage?.toUpperCase() !== 'MESSAGE';
        }
        return f.elocosaf?.toUpperCase().includes('Y-LOCO') || f.elocosaf?.toUpperCase().includes('Y-OTH');
    });

    const filtered = responsibilityFilter === 'loco'
        ? baseFiltered.filter(f => f.responsibility?.toUpperCase() !== 'OTH')
        : baseFiltered;

    const dataByEquipmentAndResp = filtered.reduce((acc, f) => {
        const equipment = f.equipment || 'N/A';
        const responsibility = f.responsibility || 'N/A';
        
        if (!acc[equipment]) acc[equipment] = {};
        if (!acc[equipment][responsibility]) {
          acc[equipment][responsibility] = { all: [], pending: [] };
        }
        
        acc[equipment][responsibility].all.push(f);
        const status = f.investigationstatus?.toUpperCase();
        if (status === 'P' || status === 'Y') {
            acc[equipment][responsibility].pending.push(f);
        }
        return acc;
    }, {} as Record<string, Record<string, { all: TractionFailure[], pending: TractionFailure[] }>>);
    
    const equipmentTotals = Object.keys(dataByEquipmentAndResp).reduce((acc, equipment) => {
      acc[equipment] = Object.values(dataByEquipmentAndResp[equipment]).flatMap(r => r.all).length;
      return acc;
    }, {} as Record<string, number>);

    const equipments = Object.keys(dataByEquipmentAndResp).sort((a, b) => equipmentTotals[b] - equipmentTotals[a]);
    const allUniqueResponsibilities = [...new Set(filtered.map(f => f.responsibility || 'N/A'))];

    const responsibilityData = allUniqueResponsibilities.map(resp => ({
        name: resp,
        total: filtered.filter(f => (f.responsibility || 'N/A') === resp).length
    }));

    const othResponsibilityData = responsibilityData.find(r => r.name.toUpperCase() === 'OTH');
    const otherResponsibilitiesData = responsibilityData.filter(r => r.name.toUpperCase() !== 'OTH');
    otherResponsibilitiesData.sort((a, b) => b.total - a.total);
    const sortedResponsibilities = [...otherResponsibilitiesData.map(r => r.name)];
    if (othResponsibilityData) {
        sortedResponsibilities.push(othResponsibilityData.name);
    }

    let colorIndex = 0;
    const datasets: any[] = [];
    sortedResponsibilities.forEach((resp) => {
        const isOth = resp.toUpperCase() === 'OTH';
        const color = isOth ? OTH_COLOR : getColor(colorIndex++);

        const completedData = equipments.map(equip => {
            const data = dataByEquipmentAndResp[equip]?.[resp];
            if (!data) return 0;
            return data.all.length - data.pending.length;
        });

        const pendingData = equipments.map(equip => {
            return dataByEquipmentAndResp[equip]?.[resp]?.pending.length || 0;
        });

        if (completedData.some(d => d > 0)) {
            datasets.push({
                label: resp,
                data: completedData,
                backgroundColor: color,
            });
        }
        if (pendingData.some(d => d > 0)) {
            datasets.push({
                label: `${resp} (Pending)`,
                data: pendingData,
                backgroundColor: createShadedPattern(color),
            });
        }
    });

    const totalFailures = datasets.reduce((total, dataset) => 
        total + dataset.data.reduce((sum: number, val: number) => sum + val, 0), 0);

    return { dataByEquipmentAndResp, equipments, datasets, totalFailures };
  }, [currentFyFailures, icmsToggle, responsibilityFilter]);

  const barChartHeight = useMemo(() => {
      const numEquipments = icmsChartData.equipments.length;
      if (numEquipments === 0) return 288;
      
      const calculatedHeight = 80 + numEquipments * 25;
      return Math.max(288, calculatedHeight);
  }, [icmsChartData.equipments]);

  useEffect(() => {
    if (!chart2Ref.current || !(window as any).Chart) return;

    if (chart2InstanceRef.current) {
        chart2InstanceRef.current.destroy();
    }
    
    const { dataByEquipmentAndResp, equipments, datasets, totalFailures } = icmsChartData;
    const ctx = chart2Ref.current.getContext('2d');
    if (!ctx) return;

    if (datasets.length === 0 || equipments.length === 0) {
        ctx.clearRect(0, 0, chart2Ref.current.width, chart2Ref.current.height);
        ctx.font = "16px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.textAlign = "center";
        ctx.fillText("No data for this selection", chart2Ref.current.width / 2, chart2Ref.current.height / 2);
        return;
    }

    chart2InstanceRef.current = new (window as any).Chart(ctx, {
        type: 'bar',
        data: { labels: equipments, datasets },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            onClick: (evt: any) => {
                const points = chart2InstanceRef.current.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const firstPoint = points[0];
                    const equipment = equipments[firstPoint.index];
                    const respWithStatus = datasets[firstPoint.datasetIndex].label;
                    const responsibility = respWithStatus.replace(' (Pending)', '');
                    
                    const failuresToShow = dataByEquipmentAndResp[equipment]?.[responsibility]?.all;
                    if (failuresToShow) {
                        setModalFailures(failuresToShow);
                    }
                }
            },
            onHover: (event: any, chartElement: any[]) => {
                event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
            },
            plugins: {
              title: { display: false },
              legend: { 
                display: true, 
                position: 'top', 
                labels: { 
                    boxWidth: 20,
                    filter: (legendItem) => !legendItem.text.includes('(Pending)')
                } 
              },
              tooltip: {
                callbacks: {
                  label: function(context: any) {
                    const equipment = context.label;
                    const respWithStatus = context.dataset.label || '';
                    const responsibility = respWithStatus.replace(' (Pending)', '');
                    const index = context.dataIndex;
                    
                    const allDatasetsForResp = context.chart.data.datasets.filter((d: any) => d.label.replace(' (Pending)', '') === responsibility);
                    
                    const totalCount = allDatasetsForResp.reduce((sum: number, ds: any) => sum + (ds.data[index] || 0), 0);
                    const pendingDataset = context.chart.data.datasets.find((d: any) => d.label === `${responsibility} (Pending)`);
                    const pendingCount = pendingDataset ? (pendingDataset.data[index] || 0) : 0;

                    if (totalCount === 0) return '';
                    
                    const failures = dataByEquipmentAndResp[equipment]?.[responsibility]?.all || [];
                    const locos = [...new Set(failures.map((f: any) => f.locono).filter(Boolean))];
                    
                    let title = `${responsibility} (${totalCount})`;
                    if (pendingCount > 0) {
                        title += ` — ${pendingCount} Pending`;
                    }
                    
                    let lines = [title];
                    if (locos.length > 0) {
                        lines = lines.concat(formatTooltipLocos(locos));
                    }
                    return lines;
                  }
                }
              }
            },
            scales: {
                x: { 
                    stacked: true, 
                    title: { 
                        display: true, 
                        text: `Number of Failures (Total: ${totalFailures})` 
                    } 
                },
                y: { stacked: true, ticks: { autoSkip: false } }
            },
        },
        plugins: [barChartTotalLabelsPlugin]
    });

  }, [icmsChartData]);

  if (isLoading) return <Loader />;
  if (error) return <ErrorMessage message={error} />;
  if (currentFyFailures.length === 0) {
      return (
          <div className="bg-bg-card p-6 rounded-lg shadow-md text-center text-text-secondary">
              No failure data available for the financial year 2025-26 to display charts.
          </div>
      )
  }

  return (
    <section className="mb-8" aria-labelledby="dashboard-title">
        {modalFailures && <FailureDetailsModal failures={modalFailures} onClose={() => setModalFailures(null)} />}
        <h2 id="dashboard-title" className="text-2xl font-bold text-center text-brand-primary mb-6">
            WAG7 Failures 2025-26 
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            <div className="bg-bg-card p-4 rounded-lg shadow-md flex flex-col">
                <h3 className="text-lg font-semibold text-text-primary text-center mb-1">Investigation Pending Locos</h3>
                 <p className="text-center text-sm text-text-secondary mb-2">
                    Total Pending: <span className="font-bold text-brand-primary">{pendingFailures.length}</span> | Total Yet to Arrive: <span className="font-bold text-brand-primary">{yetToArriveFailures.length}</span>
                </p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-x-4 gap-y-2 mb-2 text-sm">
                    <div className="flex items-center gap-1 p-1 bg-gray-200 rounded-lg">
                        <label className={`px-3 py-1 rounded-md cursor-pointer transition-colors duration-200 ${investigationToggle === 'P' ? 'bg-white shadow text-brand-primary font-semibold' : 'text-text-secondary hover:bg-gray-300'}`}>
                            <input type="radio" name="investigation" value="P" checked={investigationToggle === 'P'} onChange={() => setInvestigationToggle('P')} className="sr-only"/>
                            Pending
                        </label>
                         <label className={`px-3 py-1 rounded-md cursor-pointer transition-colors duration-200 ${investigationToggle === 'Y' ? 'bg-white shadow text-brand-primary font-semibold' : 'text-text-secondary hover:bg-gray-300'}`}>
                            <input type="radio" name="investigation" value="Y" checked={investigationToggle === 'Y'} onChange={() => setInvestigationToggle('Y')} className="sr-only"/>
                            Yet to Arrive
                        </label>
                    </div>
                     <select 
                        value={pieChartFilter} 
                        onChange={e => setPieChartFilter(e.target.value as 'all' | 'icms')}
                        className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-brand-light focus:border-brand-light text-sm text-text-secondary bg-white"
                        aria-label="Filter pie chart by ICMS or all"
                     >
                        <option value="all">All</option>
                        <option value="icms">ICMS</option>
                     </select>
                </div>
                <div className="relative flex-grow h-80">
                    <canvas ref={chart1Ref} aria-label="Pie chart of pending investigations by responsibility"></canvas>
                </div>
            </div>

            <div className="bg-bg-card p-4 rounded-lg shadow-md flex flex-col">
                <h3 className="text-lg font-semibold text-text-primary text-center mb-1">ICMS Failures by Equipment</h3>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-x-4 gap-y-2 mb-2 text-sm">
                     <div className="flex items-center gap-1 p-1 bg-gray-200 rounded-lg">
                        <label className={`px-3 py-1 rounded-md cursor-pointer transition-colors duration-200 ${icmsToggle === 'shed' ? 'bg-white shadow text-brand-primary font-semibold' : 'text-text-secondary hover:bg-gray-300'}`}>
                            <input type="radio" name="icms-source" value="shed" checked={icmsToggle === 'shed'} onChange={() => setIcmsToggle('shed')} className="sr-only"/>
                            ICMS Shed
                        </label>
                        <label className={`px-3 py-1 rounded-md cursor-pointer transition-colors duration-200 ${icmsToggle === 'elocos' ? 'bg-white shadow text-brand-primary font-semibold' : 'text-text-secondary hover:bg-gray-300'}`}>
                            <input type="radio" name="icms-source" value="elocos" checked={icmsToggle === 'elocos'} onChange={() => setIcmsToggle('elocos')} className="sr-only"/>
                            eLocos
                        </label>
                     </div>
                     <select 
                        value={responsibilityFilter} 
                        onChange={e => setResponsibilityFilter(e.target.value as 'all' | 'loco')}
                        className="px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-brand-light focus:border-brand-light text-sm text-text-secondary bg-white"
                        aria-label="Filter chart by responsibility type"
                     >
                        <option value="all">All</option>
                        <option value="loco">Loco Account</option>
                     </select>
                </div>
                <div className="relative flex-grow" style={{ height: `${barChartHeight}px` }}>
                    <canvas ref={chart2Ref} aria-label="Bar chart of ICMS failures by equipment, stacked by responsibility"></canvas>
                </div>
            </div>

        </div>
    </section>
  );
};

export default DashboardCharts;