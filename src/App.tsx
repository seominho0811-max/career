import React, { useState, useMemo } from 'react';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ReTooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  Database, 
  ListFilter, 
  RotateCcw, 
  Search, 
  Info,
  ExternalLink,
  Check,
  RefreshCw
} from 'lucide-react';
import { initialMockStudents } from './data/mockStudents';
import { Student } from './types';

export default function App() {
  // Syncing Students database state
  const [students, setStudents] = useState<Student[]>(initialMockStudents);

  // Filter States
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Live Google Apps Script URL state
  const defaultGasUrl = 'https://script.google.com/macros/s/AKfycbyyes-cgsDp17FNZYk95fh6-eRCZkJlB2EesZEk8MucdqtXSSvKJSDJ_SwvZJbb_s6TEA/exec';
  const [gasUrl, setGasUrl] = useState(defaultGasUrl);
  const [isFetchingLive, setIsFetchingLive] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  // Auto-fetch on mount
  React.useEffect(() => {
    loadData(defaultGasUrl);
  }, []);

  // Student list with parsed grade and class fields
  const parsedStudents = useMemo(() => {
    return students.map(s => {
      const trimmed = s.stuNo.trim();
      let grade = '기타';
      let classNo = '기타';
      if (trimmed.length >= 2) {
        grade = trimmed.charAt(0);
        classNo = trimmed.charAt(1);
      }
      return {
        ...s,
        grade,
        classNo
      };
    });
  }, [students]);

  // Unique list of grades for filters
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    parsedStudents.forEach(s => {
      if (s.grade && s.grade !== '기타') set.add(s.grade);
    });
    return Array.from(set).sort();
  }, [parsedStudents]);

  // Unique list of classes for filters
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    parsedStudents.forEach(s => {
      if (s.classNo && s.classNo !== '기타') set.add(s.classNo);
    });
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b));
  }, [parsedStudents]);

  // Unique list of tracks for filters
  const availableTracks = useMemo(() => {
    const set = new Set<string>();
    parsedStudents.forEach(s => {
      if (s.track) set.add(s.track.trim());
    });
    return Array.from(set).sort();
  }, [parsedStudents]);

  // Filtered Students list based on Selection Filters
  const filteredStudents = useMemo(() => {
    return parsedStudents.filter(student => {
      // Grade filter
      if (selectedGrade !== 'all' && student.grade !== selectedGrade) {
        return false;
      }
      // Class filter
      if (selectedClass !== 'all' && student.classNo !== selectedClass) {
        return false;
      }
      // Track filter
      if (selectedTrack !== 'all' && student.track !== selectedTrack) {
        return false;
      }
      // Search Box filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = student.name.toLowerCase().includes(query);
        const dept1Match = student.dept1.toLowerCase().includes(query);
        const dept2Match = (student.dept2 || '').toLowerCase().includes(query);
        const careerMatch = (student.careersRaw || '').toLowerCase().includes(query);
        const stuNoMatch = student.stuNo.includes(query);
        const ref1Match = (student.ref1 || '').toLowerCase().includes(query);
        const ref2Match = (student.ref2 || '').toLowerCase().includes(query);
        const ref3Match = (student.ref3 || '').toLowerCase().includes(query);
        const ref4Match = (student.ref4 || '').toLowerCase().includes(query);
        const ref5Match = (student.ref5 || '').toLowerCase().includes(query);

        if (
          !nameMatch && !dept1Match && !dept2Match && !careerMatch && !stuNoMatch &&
          !ref1Match && !ref2Match && !ref3Match && !ref4Match && !ref5Match
        ) {
          return false;
        }
      }
      return true;
    });
  }, [parsedStudents, selectedGrade, selectedClass, selectedTrack, searchQuery]);

  // Aggregate Career Distribution (Top 10)
  const careerChartData = useMemo(() => {
    const countMap: Record<string, number> = {};
    filteredStudents.forEach(student => {
      if (!student.careersRaw) return;
      const parsedJobs = student.careersRaw.split(',').map(j => j.trim()).filter(j => j !== '');
      parsedJobs.forEach(job => {
        countMap[job] = (countMap[job] || 0) + 1;
      });
    });

    const entries = Object.entries(countMap).map(([name, count]) => ({ name, count }));
    const sorted = entries.sort((a, b) => b.count - a.count);
    return sorted.slice(0, 10);
  }, [filteredStudents]);



  // Aggregate Department 1 Distribution (Top 10 + Others)
  const deptChartData = useMemo(() => {
    const countMap: Record<string, number> = {};
    filteredStudents.forEach(student => {
      const dept = student.dept1 ? student.dept1.trim() : '';
      if (!dept) return;
      countMap[dept] = (countMap[dept] || 0) + 1;
    });

    const entries = Object.entries(countMap).map(([name, count]) => ({ name, count }));
    const sorted = entries.sort((a, b) => b.count - a.count);

    const top10 = sorted.slice(0, 10);
    if (sorted.length > 10) {
      const othersCount = sorted.slice(10).reduce((acc, curr) => acc + curr.count, 0);
      top10.push({ name: '기타 학과', count: othersCount });
    }
    return top10;
  }, [filteredStudents]);

  // Top elements for Bento metrics
  const trackChartData = useMemo(() => {
    const countMap: Record<string, number> = {};
    filteredStudents.forEach(student => {
      const trk = student.track ? student.track.trim() : '';
      if (!trk || trk === '미정' || trk === '미등록' || trk === '-' || trk === '미분류' || trk.toLowerCase() === 'undefined') return;
      countMap[trk] = (countMap[trk] || 0) + 1;
    });

    const entries = Object.entries(countMap).map(([name, count]) => ({ name, count }));
    const sorted = entries.sort((a, b) => b.count - a.count);
    return sorted.slice(0, 10);
  }, [filteredStudents]);



  // Colors for Doughnut Chart cells
  const colorsPalette = [
    '#4f46e5', // indigo-600
    '#3b82f6', // blue-500
    '#10b981', // emerald-500
    '#14b8a6', // teal-500
    '#06b6d4', // cyan-500
    '#f59e0b', // amber-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#f43f5e', // rose-500
    '#0284c7', // sky-600
    '#059669', // emerald-650
    '#64748b'  // slate-500
  ];

  // Fetch live data from Google Apps Script Web App URL
  const loadData = async (urlToFetch: string) => {
    if (!urlToFetch) return;
    setIsFetchingLive(true);
    setLiveError(null);
    setIsSynced(false);

    try {
      const cleanedUrl = urlToFetch.trim();
      const separator = cleanedUrl.includes('?') ? '&' : '?';
      const targetUrl = `${cleanedUrl}${separator}api=true`;
      
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
      
      let response: Response;
      let usedDirectFallback = false;
      let originalProxyStatus: number | null = null;
      
      try {
        response = await fetch(proxyUrl);
        if (response.status === 404) {
          originalProxyStatus = 404;
          // Fallback to direct client-side fetch (for static sites like GitHub Pages without an Express backend)
          usedDirectFallback = true;
          response = await fetch(targetUrl);
        }
      } catch (proxyError) {
        // Fallback to direct fetch on network/CORS error for the proxy route
        usedDirectFallback = true;
        response = await fetch(targetUrl);
      }
      
      let data;
      if (!response.ok) {
        let errMsg = `HTTP 에러! 상태 코드: ${response.status}`;
        if (usedDirectFallback) {
          errMsg += ` (구글 앱스 스크립트 웹앱 직접 호출 실패)`;
          if (originalProxyStatus === 404) {
            errMsg += ` [GitHub Pages 등 정적 서버 환경 감지 - /api/proxy 미존재]`;
          }
        } else {
          try {
            const errData = await response.json();
            if (errData && errData.error) {
              errMsg = errData.error;
            }
          } catch {}
        }
        throw new Error(errMsg);
      } else {
        data = await response.json();
      }
      
      if (Array.isArray(data)) {
        const mapped: Student[] = data.map((item: any, idx: number) => ({
          id: `live-${idx}-${Date.now()}`,
          stuNo: String(item.stuNo || item.학번 || item.学番 || ''),
          name: String(item.name || item.이름 || item.名前 || ''),
          dept1: String(item.dept1 || item.희망학과1 || item.希望学科1 || ''),
          dept2: String(item.dept2 || item.희망학과2 || item.希望学科2 || ''),
          careersRaw: String(item.careersRaw || item.진로 || item.進路 || ''),
          track: String(item.track || item.계열 || item.Track || '미등록'),
          submittedAt: String(item.submittedAt || item.작성시간 || item.作成時間 || ''),
          ref1: String(item.ref1 || item.참고1 || item.参考1 || ''),
          ref2: String(item.ref2 || item.참고2 || item.参考2 || ''),
          ref3: String(item.ref3 || item.참고3 || item.参考3 || ''),
          ref4: String(item.ref4 || item.참고4 || item.参考4 || ''),
          ref5: String(item.ref5 || item.참고5 || item.参考5 || '')
        }));
        
        setStudents(mapped);
        setIsSynced(true);
      } else {
        throw new Error('전달받은 Google Apps Script 응답이 배열형 데이터가 아닙니다. JSON 배열 형식을 준수했는지 확인하세요.');
      }
    } catch (err: any) {
      console.error(err);
      setLiveError(
        '실시간 동기화 실패: ' + err.message + 
        '. Apps Script 배포 시 "액세스 권한이 있는 사용자"를 "모든 사용자(Anyone)"로 정교히 배포했는지 다시 확인해 주세요.'
      );
    } finally {
      setIsFetchingLive(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
      
      {/* Top Header */}
      <header id="app-header" className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 flex items-center justify-center">
              <Database className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">진로 · 희망학과 실시간 대시보드</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isFetchingLive && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                동기화 중...
              </span>
            )}
            <button 
              onClick={() => loadData(gasUrl)}
              disabled={isFetchingLive}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              title="실시간 데이터 새로고침"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLive ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

        {liveError && (
          <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{liveError}</span>
          </div>
        )}

        {/* Bento Grid layout */}
        <div className="grid grid-cols-12 gap-5">

          {/* Career Chart (Bar) */}
          <div className="col-span-12 lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm lg:h-[510px] border-t-2 border-t-indigo-500 hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2 h-4 bg-indigo-600 rounded-full"></span>
                가장 인기 있는 진로 Top 10
              </h3>
            </div>

            <div className="h-[315px] lg:h-[315px] w-full shrink-0">
              {careerChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart 
                    data={careerChartData} 
                    layout="vertical"
                    margin={{ top: 5, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis 
                      type="number"
                      allowDecimals={false} 
                      tickLine={false}
                      style={{ fontSize: '10px', fill: '#64748b' }}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      width={65}
                      tickLine={false} 
                      style={{ fontSize: '10px', fontWeight: 600, fill: '#475569' }}
                    />
                    <ReTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      name="학생수(명)" 
                      fill="#4f46e5" 
                      radius={[0, 4, 4, 0]}
                      maxBarSize={12}
                    />
                  </ReBarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  표출할 진로 통계 목록이 존재하지 않습니다.
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 mt-auto grid grid-cols-3 gap-1.5">
              {careerChartData.slice(0, 6).map((item, idx) => (
                <div key={item.name} className="flex flex-col bg-slate-50 px-1.5 py-1 rounded-lg border border-slate-100 text-center">
                  <span className="text-[9px] font-bold text-indigo-600 truncate">#{idx + 1} {item.name}</span>
                  <span className="text-xs font-black text-slate-700 mt-0.5">{item.count}명</span>
                </div>
              ))}
            </div>
          </div>

          {/* Major Chart (Pie) */}
          <div className="col-span-12 lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm lg:h-[510px] border-t-2 border-t-amber-500 hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-1">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2 h-4 bg-amber-500 rounded-full"></span>
                희망학과 Top 10 구성 비율
              </h3>
              <span className="text-[10px] bg-amber-50 px-2 py-1 rounded font-bold text-amber-700 uppercase tracking-wider font-mono">1순위 지망</span>
            </div>

            <div className="flex flex-col gap-3 flex-1 min-h-0">
              <div className="h-32 w-full relative flex justify-center shrink-0">
                {deptChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={deptChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={54}
                        paddingAngle={3}
                        dataKey="count"
                      >
                        {deptChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={colorsPalette[index % colorsPalette.length]} />
                        ))}
                      </Pie>
                      <ReTooltip
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '11px'
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    표출할 학과 선호 데이터가 없습니다.
                  </div>
                )}
              </div>

              {/* Detailed percentages list */}
              <div className="space-y-1.5 overflow-y-auto pr-1 flex-1 min-h-[120px] max-h-[225px]">
                {deptChartData.map((item, idx) => {
                  const total = deptChartData.reduce((acc, curr) => acc + curr.count, 0);
                  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between text-[11px] py-1.5 px-2 hover:bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorsPalette[idx % colorsPalette.length] }}></span>
                        <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 text-slate-400 font-medium">
                        <span className="font-bold text-slate-900">{item.count}명</span>
                        <span>({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-2 text-center text-[10px] text-slate-400 font-medium select-none mt-auto shrink-0">
              10위 밖의 학과는 <strong>'기타 학과'</strong>로 구성됩니다.
            </div>
          </div>

          {/* Track Chart (Progress Bar style) */}
          <div className="col-span-12 lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col shadow-sm lg:h-[510px] border-t-2 border-t-violet-500 hover:shadow-md transition-all">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-1">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-2 h-4 bg-violet-600 rounded-full"></span>
                희망 계열별 선호도 분포
              </h3>
            </div>

            <div className="flex-grow space-y-3 lg:space-y-2.5 overflow-y-auto pr-1 max-h-[400px] min-h-[180px]">
              {trackChartData.length > 0 ? (
                trackChartData.map((item, idx) => {
                  const total = trackChartData.reduce((acc, curr) => acc + curr.count, 0);
                  const percent = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  const trackColors = [
                    { bg: 'bg-violet-500' },
                    { bg: 'bg-indigo-500' },
                    { bg: 'bg-emerald-500' },
                    { bg: 'bg-amber-500' },
                    { bg: 'bg-pink-500' },
                    { bg: 'bg-cyan-500' },
                    { bg: 'bg-rose-500' },
                    { bg: 'bg-slate-500' }
                  ];
                  const colorScheme = trackColors[idx % trackColors.length];

                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-700 flex items-center gap-1.5 truncate font-medium">
                          <span className={`w-1.5 h-1.5 rounded-full ${colorScheme.bg} shrink-0`}></span>
                          <span className="truncate">{item.name}</span>
                        </span>
                        <div className="flex items-center gap-1 text-slate-400 font-medium shrink-0">
                          <span className="font-bold text-slate-900">{item.count}명</span>
                          <span>({percent}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${colorScheme.bg} rounded-full transition-all duration-500 ease-out`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-8">
                  표출할 계열 통계가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Filters Card (Positioned to the right of the Track diagram) */}
          <div className="col-span-12 lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:h-[510px] border-t-2 border-t-indigo-600 hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                    <ListFilter className="w-4 h-4" />
                  </div>
                  <h2 className="font-bold text-slate-800 text-sm">대시보드 필터</h2>
                </div>
                {(selectedGrade !== 'all' || selectedClass !== 'all' || selectedTrack !== 'all' || searchQuery !== '') && (
                  <button 
                    onClick={() => {
                      setSelectedGrade('all');
                      setSelectedClass('all');
                      setSelectedTrack('all');
                      setSearchQuery('');
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    필터 초기화
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-3.5">
                {/* 1. Grade (학년) */}
                <div>
                  <label htmlFor="dashboard-grade-filter" className="block text-xs font-bold text-slate-500 ml-1 mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> 학년
                  </label>
                  <select 
                    id="dashboard-grade-filter"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                  >
                    <option value="all">학년 (전체)</option>
                    {availableGrades.map(g => (
                      <option key={g} value={g}>{g}학년</option>
                    ))}
                  </select>
                </div>

                {/* 2. Class (반) */}
                <div>
                  <label htmlFor="dashboard-class-filter" className="block text-xs font-bold text-slate-500 ml-1 mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> 반
                  </label>
                  <select 
                    id="dashboard-class-filter"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                  >
                    <option value="all">반 (전체)</option>
                    {availableClasses.map(c => (
                      <option key={c} value={c}>{c}반</option>
                    ))}
                  </select>
                </div>

                {/* 3. Name (이름) */}
                <div>
                  <label htmlFor="dashboard-text-search" className="block text-xs font-bold text-slate-500 ml-1 mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> 이름
                  </label>
                  <div className="relative">
                    <input 
                      id="dashboard-text-search"
                      type="text"
                      placeholder="이름 또는 검색어 입력..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    />
                    <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                {/* 4. Track (계열) */}
                <div>
                  <label htmlFor="dashboard-track-filter" className="block text-xs font-bold text-slate-500 ml-1 mb-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> 계열
                  </label>
                  <select 
                    id="dashboard-track-filter"
                    value={selectedTrack}
                    onChange={(e) => setSelectedTrack(e.target.value)}
                    className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
                  >
                    <option value="all">계열 (전체)</option>
                    {availableTracks.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="col-span-12 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col border-t-2 border-t-slate-700">
            <div className="bg-slate-50/80 border-b border-slate-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">학생별 상세 진로 현황 명단</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">사용자 필터 및 키워드 검색 결과 명단</p>
              </div>
              <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase font-mono bg-white px-2 py-1 rounded-md border border-slate-200/60">Live Data Sync</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/40 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                    <th className="px-4 py-3 whitespace-nowrap w-[8%] min-w-[90px]">학번</th>
                    <th className="px-4 py-3 whitespace-nowrap w-[10%] min-w-[100px]">이름</th>
                    <th className="px-4 py-3 text-indigo-600 font-bold whitespace-nowrap w-[12%] min-w-[110px]">희망학과 1지망</th>
                    <th className="px-4 py-3 text-emerald-600 font-bold whitespace-nowrap w-[12%] min-w-[110px]">희망학과 2지망</th>
                    <th className="px-4 py-3 whitespace-nowrap w-[18%] min-w-[140px]">진로 (상세)</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap w-[10%] min-w-[90px]">계열</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100">
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {student.stuNo ? (
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200/70 px-2 py-0.5 rounded-md select-all">
                              {student.stuNo}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded select-none">미입력</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">
                          {student.name || (
                            <span className="text-slate-300 font-normal text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded select-none">미입력</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {student.dept1 ? (
                            <div className="flex items-center gap-1.5 font-semibold text-indigo-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                              <span>{student.dept1}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded select-none">미입력</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {student.dept2 && student.dept2.trim() ? (
                            <div className="flex items-center gap-1.5 font-medium text-emerald-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                              <span>{student.dept2}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-normal text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded select-none">미입력</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {student.careersRaw && student.careersRaw.trim() ? (
                              student.careersRaw.split(',').map((job, idx) => {
                                const trimmed = job.trim();
                                if (!trimmed) return null;
                                return (
                                  <span key={idx} className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-100/60 rounded text-[10px] font-bold whitespace-nowrap transition-all hover:bg-sky-100/80">
                                    {trimmed}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-slate-300 font-normal text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded select-none">미입력</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-left whitespace-nowrap">
                          {student.track && student.track !== '미등록' ? (
                            <span className="px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 font-bold rounded text-[10px]">
                              {student.track}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-normal text-[10px] bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded select-none">미입력</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-12">
                        <div className="max-w-xs mx-auto">
                          <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <h4 className="font-bold text-slate-700 text-xs">일치하는 학생 데이터가 없습니다</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">상단 드롭다운 또는 키워드 검색을 초기화해야 합니다.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>

      {/* Styled simple footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>© 2026 진로 및 희망학과 실시간 대시보드</span>
          <span className="text-slate-300 max-sm:hidden">|</span>
          <span className="text-slate-500">Google Apps Script HTML5/Tailwind CSS/Recharts 연동 대시보드</span>
        </div>
      </footer>

    </div>
  );
}
