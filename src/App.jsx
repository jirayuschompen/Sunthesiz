import React, {useState} from 'react';
    import { TrendingUp, AlertTriangle, Activity, Settings, Calendar, Package, Factory, Cpu, 
      Bell, ChevronRight, CheckCircle, XCircle, Clock, X, User, LogOut, Shield, 
      FileText, Loader, Check, Upload, Download, Cloud, Wind, Droplets, Gauge, 
      Search, Map  } from 'lucide-react';
    import Overview from './Overviewpage';
    import Forecast from './Forecastpage';
    import Planning from './Planningpage';
    import Maintenance from './Maintenancepage';
    import LoginMockup from './login';
    import SungrowLivePanel from './SungrowLivePanel';
    import FleetOverviewPage from './FleetOverviewPage';

    // --- App Component ---
  const App = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
  
    if (!isAuthenticated) {
      return <LoginMockup onLogin={() => setIsAuthenticated(true)} />;
    }
    return <Dashboard onLogout={() => setIsAuthenticated(false)} />;
  };
  

    const generateDailyData = () => {
      const data = [];
      for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 10) {
          const timeLabel = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          let baseValue = 0;
          if (h < 6) baseValue = 150;        
          else if (h < 9) baseValue = 300 + ((h - 6) * 200); 
          else if (h < 12) baseValue = 850;  
          else if (h < 13) baseValue = 700;  
          else if (h < 17) baseValue = 900;  
          else if (h < 21) baseValue = 600 - ((h - 17) * 100); 
          else baseValue = 200;              
          
          const randomNoise = (Math.random() - 0.5) * 40; 
          const actual = Math.max(0, baseValue + randomNoise);
          const forecast = baseValue * 1.02; 
          const upper = forecast * 1.15;
          const lower = forecast * 0.85;

          data.push({
            label: timeLabel,
            actual: Math.round(actual),
            forecast: Math.round(forecast),
            upper: Math.round(upper),
            lower: Math.round(lower)
          });
        }
      }
      return data;
    };

    const generateHourlyOEE = () => {
      const data = [];
      for (let i = 6; i <= 17; i++) {
        const hour = i.toString().padStart(2, '0') + ':00';
        let oee = 0;
        if (i === 12) {
          oee = 45;
        } else {
          oee = 85 + Math.floor(Math.random() * 10);
        }
        data.push({ label: hour, oee: oee });
      }
      return data;
    };

    // --- Dashboard Component ---
    // Pages that are currently turned on. Add 'maintenance' / 'planning' / 'fleet' back here to re-enable them.
    const ENABLED_TABS = ['overview', 'forecast'];

    const Dashboard = ({ onLogout }) => {
      const [activeTab, setActiveTab] = useState('overview');
      const [showNotifications, setShowNotifications] = useState(false);
      const [showUserMenu, setShowUserMenu] = useState(false);
      const [showForecastModal, setShowForecastModal] = useState(false);
      const [showPlanningModal, setShowPlanningModal] = useState(false);
      const [showAnalysisModal, setShowAnalysisModal] = useState(false);
      const [isProcessing, setIsProcessing] = useState(false);
      const [processingMessage, setProcessingMessage] = useState('');
      const [showSuccessMessage, setShowSuccessMessage] = useState(false);
      const [successMessage, setSuccessMessage] = useState('');
      const [language, setLanguage] = useState('en');
      const [theme, setTheme] = useState('dark');
      const [fleetSummary, setFleetSummary] = useState(null);
      const [plantWeather, setPlantWeather] = useState({});
      const [allPlantsData, setAllPlantsData] = useState([]);
      const [selectedPlantId,   setSelectedPlantId]   = useState(null);
      const [selectedPlantData, setSelectedPlantData] = useState(null);
      const [selectedMachine, setSelectedMachine] = useState(null);
      const [showMachineDetail, setShowMachineDetail] = useState(false);
      const [showScheduleModal, setShowScheduleModal] = useState(false);
      const [scheduleType, setScheduleType] = useState('inspection');
      const [productionPeriod, setProductionPeriod] = useState('daily');
      const [demandPeriod, setDemandPeriod] = useState('monthly');
      const [scheduleForm, setScheduleForm] = useState({
        date: '',
        time: '',
        technician: '',
        priority: 'medium',
        notes: ''
      });
      const [showAllAlerts, setShowAllAlerts] = useState(false);
      const [alertFilter, setAlertFilter] = useState('all');
      const [alertSearch, setAlertSearch] = useState('');

      const productionDataSets = {
        daily: generateHourlyOEE(),
        weekly: [
          { label: 'Mon', oee: 85 }, { label: 'Tue', oee: 87 }, { label: 'Wed', oee: 82 },
          { label: 'Thu', oee: 89 }, { label: 'Fri', oee: 86 }, { label: 'Sat', oee: 75 }, { label: 'Sun', oee: 0 }
        ],
        monthly: [
          { label: 'Jan', oee: 80 }, { label: 'Feb', oee: 82 }, { label: 'Mar', oee: 81 },
          { label: 'Apr', oee: 85 }, { label: 'May', oee: 86 }, { label: 'Jun', oee: 84 },
          { label: 'Jul', oee: 87 }, { label: 'Aug', oee: 88 }, { label: 'Sep', oee: 86 },
          { label: 'Oct', oee: 89 }, { label: 'Nov', oee: 88 }, { label: 'Dec', oee: 90 }
        ],
        yearly: [
          { label: '2021', oee: 78 }, { label: '2022', oee: 82 },
          { label: '2023', oee: 85 }, { label: '2024', oee: 86 }, { label: '2025', oee: 88 }
        ]
      };
      
      const demandDataSets = {
        daily: generateDailyData(),
        weekly: [
          { label: 'Mon', actual: 4250, forecast: 4300, upper: 4600, lower: 4000 },
          { label: 'Tue', actual: 4400, forecast: 4350, upper: 4650, lower: 4050 },
          { label: 'Wed', actual: 4150, forecast: 4200, upper: 4500, lower: 3900 },
          { label: 'Thu', actual: 4600, forecast: 4550, upper: 4900, lower: 4200 },
          { label: 'Fri', actual: 4850, forecast: 4900, upper: 5300, lower: 4500 },
          { label: 'Sat', actual: 3800, forecast: 3900, upper: 4200, lower: 3600 },
          { label: 'Sun', actual: 3500, forecast: 3600, upper: 3900, lower: 3300 }
        ],
        monthly: [
          { label: 'Jan', actual: 850, forecast: 860, upper: 950, lower: 780 },
          { label: 'Feb', actual: 920, forecast: 910, upper: 1000, lower: 820 },
          { label: 'Mar', actual: 880, forecast: 890, upper: 980, lower: 800 },
          { label: 'Apr', actual: 1050, forecast: 1040, upper: 1150, lower: 950 },
          { label: 'May', actual: 1100, forecast: 1120, upper: 1250, lower: 1000 },
          { label: 'Jun', actual: 1080, forecast: 1090, upper: 1200, lower: 980 },
          { label: 'Jul', actual: 0, forecast: 1150, upper: 1300, lower: 1000 },
          { label: 'Aug', actual: 0, forecast: 1200, upper: 1350, lower: 1050 },
          { label: 'Sep', actual: 0, forecast: 1180, upper: 1320, lower: 1020 },
          { label: 'Oct', actual: 0, forecast: 1250, upper: 1400, lower: 1100 }
        ],
        yearly: [
          { label: '2021', actual: 12000, forecast: 11800, upper: 13000, lower: 10500 },
          { label: '2022', actual: 14500, forecast: 14200, upper: 15500, lower: 13000 },
          { label: '2023', actual: 16800, forecast: 17000, upper: 18500, lower: 15500 },
          { label: '2024', actual: 18500, forecast: 18200, upper: 20000, lower: 16500 },
          { label: '2025', actual: 0, forecast: 21000, upper: 23500, lower: 19000 }
        ]
      };

      const [analysisParams, setAnalysisParams] = useState({
        type: 'full',
        horizon: '7',
        options: {
          anomaly: true,
          maintenance: true,
          cost: true,
          report: true
        }
      });

      const t = {
        th: {
          title: 'ระบบผลิตอัจฉริยะ',
          subtitle: 'แพลตฟอร์มวิเคราะห์ข้อมูลเชิงคาดการณ์',
          notifications: 'การแจ้งเตือน',
          markAllRead: 'ทำเครื่องหมายอ่านทั้งหมด',
          viewAll: 'ดูทั้งหมด',
          profile: 'โปรไฟล์',
          settings: 'ตั้งค่า',
          security: 'ความปลอดภัย',
          apiDocs: 'เอกสาร API',
          logout: 'ออกจากระบบ',
          language: 'ภาษา',
          themeMode: 'โหมดธีม',
          light: 'สว่าง',
          dark: 'มืด',
          overview: 'ภาพรวม',
          selectPlant: 'เลือกโรงไฟฟ้า',
          allPlants: 'ทุกโรง',
          demandForecasting: 'พยากรณ์ความต้องการ',
          productionPlanning: 'วางแผนการผลิต',
          predictiveMaintenance: 'การบำรุงรักษาเชิงคาดการณ์',
          overallOEE: 'PR (Performance Ratio)',
          forecastAccuracy: 'ความแม่นยำการพยากรณ์',
          activeMachines: 'เครื่องจักรที่ทำงาน',
          criticalAlerts: 'การแจ้งเตือนสำคัญ',
          underMaintenance: 'อยู่ระหว่างบำรุงรักษา',
          newToday: 'ใหม่วันนี้',
          weeklyProduction: 'ประสิทธิภาพการผลิตรายสัปดาห์',
          demandTrend: 'แนวโน้มและการพยากรณ์ความต้องการ',
          recentAlerts: 'การแจ้งเตือนล่าสุด',
          machineHealth: 'สถานะสุขภาพเครื่องจักร',
          healthScore: 'คะแนนสุขภาพ',
          rul: 'อายุการใช้งานคงเหลือ',
          days: 'วัน',
          good: 'ดี',
          warning: 'เตือน',
          critical: 'วิกฤต',
          generateForecast: 'สร้างการพยากรณ์ใหม่',
          runAnalysis: 'วิเคราะห์',
          optimizeSchedule: 'ปรับปรุงตารางการผลิต',
          cancel: 'ยกเลิก',
          processing: 'กำลังประมวลผล...',
          success: 'สำเร็จ!',
          aiDriven: 'การตรวจสอบสุขภาพอุปกรณ์และพยากรณ์ความเสียหายด้วย AI',
          failureProbability: 'โอกาสความเสียหาย (30วัน)',
          lastMaintenance: 'บำรุงรักษาล่าสุด',
          scheduleUrgent: 'กำหนดการบำรุงรักษาเร่งด่วน',
          scheduleInspection: 'กำหนดการตรวจสอบ',
          viewDetails: 'ดูรายละเอียด',
          daysAgo: 'วันที่แล้ว',
          machineType: 'ประเภทเครื่องจักร',
          installDate: 'วันที่ติดตั้ง',
          operatingHours: 'ชั่วโมงการทำงาน',
          maintenanceHistory: 'ประวัติการบำรุงรักษา',
          sensorData: 'ข้อมูลเซ็นเซอร์',
          temperature: 'อุณหภูมิ',
          vibration: 'การสั่นสะเทือน',
          pressure: 'แรงดัน',
          speed: 'ความเร็ว',
          normal: 'ปกติ',
          high: 'สูง',
          recommendations: 'คำแนะนำ',
          scheduleMaintenance: 'กำหนดการบำรุงรักษา',
          exportReport: 'ส่งออกรายงาน',
          close: 'ปิด',
          scheduleTitle: 'กำหนดการบำรุงรักษา',
          urgentMaintenance: 'บำรุงรักษาเร่งด่วน',
          routineInspection: 'ตรวจสอบตามปกติ',
          selectDate: 'เลือกวันที่',
          selectTime: 'เลือกเวลา',
          assignTechnician: 'มอบหมายช่าง',
          selectTechnician: 'เลือกช่างผู้รับผิดชอบ',
          priority: 'ลำดับความสำคัญ',
          low: 'ต่ำ',
          medium: 'ปานกลาง',
          additionalNotes: 'บันทึกเพิ่มเติม',
          notesPlaceholder: 'ระบุรายละเอียดเพิ่มเติม อาการที่พบ หรือคำขอพิเศษ...',
          confirmSchedule: 'ยืนยันการนัดหมาย',
          scheduleSuccess: 'นัดหมายสำเร็จ!',
          scheduleSuccessMessage: 'การนัดหมายได้ถูกบันทึกและแจ้งเตือนช่างเรียบร้อยแล้ว',
          allAlerts: 'การแจ้งเตือนทั้งหมด',
          filterAlerts: 'กรองการแจ้งเตือน',
          all: 'ทั้งหมด',
          unread: 'ยังไม่อ่าน',
          read: 'อ่านแล้ว',
          searchAlerts: 'ค้นหาการแจ้งเตือน...',
          deleteAlert: 'ลบ',
          deleteAll: 'ลบทั้งหมด',
          noAlertsFound: 'ไม่พบการแจ้งเตือน',
          severity: 'ความสำคัญ',
          machine: 'เครื่องจักร',
          message: 'ข้อความ',
          time: 'เวลา',
          action: 'การดำเนินการ',
          alertDeleted: 'ลบการแจ้งเตือนแล้ว',
        },
        en: {
          title: 'Sunthesiz',
          subtitle: 'Synthesizing the Sun for Intelligent Power',
          notifications: 'Notifications',
          markAllRead: 'Mark all as read',
          viewAll: 'View All',
          profile: 'My Profile',
          settings: 'Settings',
          security: 'Security',
          apiDocs: 'API Documentation',
          logout: 'Logout',
          language: 'Language',
          themeMode: 'Theme Mode',
          light: 'Light',
          dark: 'Dark',
          overview: 'Overview',
          selectPlant: 'Select Plant',
          allPlants: 'All Plants',
          demandForecasting: 'Demand Forecasting',
          productionPlanning: 'Production Planning',
          predictiveMaintenance: 'Predictive Maintenance',
          overallOEE: 'PR (Performance Ratio)',
          forecastAccuracy: 'Forecast Accuracy',
          activeMachines: 'Active Machines',
          criticalAlerts: 'Critical Alerts',
          underMaintenance: 'under maintenance',
          newToday: 'new today',
          weeklyProduction: 'Production Efficiency',
          demandTrend: 'Demand Trend & Forecast',
          recentAlerts: 'Recent Alerts',
          machineHealth: 'Machine Health Status',
          healthScore: 'Health Score',
          rul: 'RUL',
          days: 'days',
          good: 'good',
          warning: 'warning',
          critical: 'critical',
          generateForecast: 'Generate New Forecast',
          runAnalysis: 'Run Analysis',
          optimizeSchedule: 'Optimize Schedule',
          cancel: 'Cancel',
          processing: 'Processing...',
          success: 'Success!',
          aiDriven: 'AI-driven equipment health monitoring and failure prediction',
          failureProbability: 'Failure Probability (30d)',
          lastMaintenance: 'Last Maintenance',
          scheduleUrgent: 'Schedule Urgent Maintenance',
          scheduleInspection: 'Schedule Inspection',
          viewDetails: 'View Details',
          daysAgo: 'days ago',
          machineType: 'Machine Type',
          installDate: 'Install Date',
          operatingHours: 'Operating Hours',
          maintenanceHistory: 'Maintenance History',
          sensorData: 'Sensor Data',
          temperature: 'Temperature',
          vibration: 'Vibration',
          pressure: 'Pressure',
          speed: 'Speed',
          normal: 'Normal',
          high: 'High',
          recommendations: 'Recommendations',
          scheduleMaintenance: 'Schedule Maintenance',
          exportReport: 'Export Report',
          close: 'Close',
          scheduleTitle: 'Schedule Maintenance',
          urgentMaintenance: 'Urgent Maintenance',
          routineInspection: 'Routine Inspection',
          selectDate: 'Select Date',
          selectTime: 'Select Time',
          assignTechnician: 'Assign Technician',
          selectTechnician: 'Select responsible technician',
          priority: 'Priority',
          low: 'Low',
          medium: 'Medium',
          additionalNotes: 'Additional Notes',
          notesPlaceholder: 'Specify details, symptoms found, or special requests...',
          confirmSchedule: 'Confirm Schedule',
          scheduleSuccess: 'Schedule Successful!',
          scheduleSuccessMessage: 'Appointment has been recorded and technician notified successfully',
          allAlerts: 'All Alerts',
          filterAlerts: 'Filter Alerts',
          all: 'All',
          unread: 'Unread',
          read: 'Read',
          searchAlerts: 'Search alerts...',
          deleteAlert: 'Delete',
          deleteAll: 'Delete All',
          noAlertsFound: 'No alerts found',
          severity: 'Severity',
          machine: 'Machine',
          message: 'Message',
          time: 'Time',
          action: 'Action',
          alertDeleted: 'Alert deleted',
        }
      };

      const currentLang = t[language];

      const [alerts, setAlerts] = useState([
        { id: 1, type: 'warning', machine: 'Inverter101', message: 'Health score dropped to 65%', time: '10 mins ago', severity: 'high', read: false },
        { id: 2, type: 'info', machine: 'Inverter103', message: 'Maintenance scheduled', time: '1 hour ago', severity: 'medium', read: false },
        { id: 3, type: 'critical', machine: 'Irradiation201', message: 'Anomaly detected in vibration', time: '25 mins ago', severity: 'critical', read: false },
        { id: 4, type: 'info', machine: 'System', message: 'Model v1.2.3 deployed successfully', time: '2 hours ago', severity: 'low', read: true },
        { id: 5, type: 'warning', machine: 'Inverter102', message: 'Temperature above normal', time: '3 hours ago', severity: 'medium', read: true },
        { id: 6, type: 'critical', machine: 'Irradiation101', message: 'Pressure sensor malfunction detected', time: '4 hours ago', severity: 'critical', read: true },
        { id: 7, type: 'info', machine: 'Inverter104', message: 'Routine inspection completed', time: '5 hours ago', severity: 'low', read: true },
        { id: 8, type: 'warning', machine: 'Inverter101', message: 'Vibration levels increasing', time: '6 hours ago', severity: 'high', read: true },
        { id: 9, type: 'info', machine: 'System', message: 'Daily backup completed', time: '8 hours ago', severity: 'low', read: true },
        { id: 10, type: 'warning', machine: 'Irradiation201', message: 'Hydraulic fluid low', time: '10 hours ago', severity: 'medium', read: true },
        { id: 11, type: 'critical', machine: 'Inverter103', message: 'Motor overheating', time: '12 hours ago', severity: 'critical', read: true },
        { id: 12, type: 'info', machine: 'Inverter102', message: 'Calibration successful', time: '1 day ago', severity: 'low', read: true },
        { id: 13, type: 'warning', machine: 'Irradiation101', message: 'Belt tension adjustment needed', time: '1 day ago', severity: 'medium', read: true },
        { id: 14, type: 'info', machine: 'System', message: 'Security patch applied', time: '2 days ago', severity: 'low', read: true },
        { id: 15, type: 'warning', machine: 'Inverter101', message: 'Coolant level low', time: '2 days ago', severity: 'medium', read: true },
      ]);

      const [forecastParams, setForecastParams] = useState({
        horizon: 90,
        products: ['PROD-001', 'PROD-002'],
        includeConfidence: true,
        confidenceLevel: 0.95
      });

      const [planningParams, setPlanningParams] = useState({
        startDate: '2024-07-01',
        endDate: '2024-07-31',
        objective: 'minimize_cost',
        constraints: 'standard'
      });

      const machineHealth = [
        { 
          name: 'Inverter101', health: 65, status: 'warning', rul: 45,
          type: 'Solar Inverter', installDate: '2020-03-15', operatingHours: 18500,
          lastMaintenance: '45 days ago',
          sensors: {
            temperature: { value: 75, unit: '°C', status: 'high' },
            vibration: { value: 8.5, unit: 'mm/s', status: 'high' },
            pressure: { value: 5.2, unit: 'bar', status: 'normal' },
            speed: { value: 2400, unit: 'rpm', status: 'normal' }
          },
          maintenanceHistory: [
            { date: '2024-05-20', type: 'Routine Inspection', cost: 1200 },
            { date: '2024-03-10', type: 'Belt Replacement', cost: 3500 },
            { date: '2024-01-05', type: 'Lubrication', cost: 800 }
          ]
        },
        { 
          name: 'Inverter102', health: 92, status: 'good', rul: 120,
          type: 'Solar Inverter', installDate: '2021-08-22', operatingHours: 12300,
          lastMaintenance: '15 days ago',
          sensors: {
            temperature: { value: 62, unit: '°C', status: 'normal' },
            vibration: { value: 4.2, unit: 'mm/s', status: 'normal' },
            pressure: { value: 5.0, unit: 'bar', status: 'normal' },
            speed: { value: 2350, unit: 'rpm', status: 'normal' }
          },
          maintenanceHistory: [
            { date: '2024-06-20', type: 'Routine Inspection', cost: 1200 },
            { date: '2024-04-12', type: 'Calibration', cost: 2100 }
          ]
        },
        { 
          name: 'Irradiation101', health: 88, status: 'good', rul: 95,
          type: 'Irradiation Sensor', installDate: '2019-11-10', operatingHours: 22100,
          lastMaintenance: '20 days ago',
          sensors: {
            temperature: { value: 68, unit: '°C', status: 'normal' },
            vibration: { value: 5.8, unit: 'mm/s', status: 'normal' },
            pressure: { value: 8.5, unit: 'bar', status: 'normal' },
            speed: { value: 1800, unit: 'rpm', status: 'normal' }
          },
          maintenanceHistory: [
            { date: '2024-06-15', type: 'Oil Change', cost: 1800 },
            { date: '2024-04-01', type: 'Seal Replacement', cost: 4200 }
          ]
        },
        { 
          name: 'Irradiation201', health: 58, status: 'critical', rul: 25,
          type: 'Irradiation Sensor', installDate: '2018-05-20', operatingHours: 28900,
          lastMaintenance: '60 days ago',
          sensors: {
            temperature: { value: 82, unit: '°C', status: 'high' },
            vibration: { value: 12.3, unit: 'mm/s', status: 'high' },
            pressure: { value: 7.8, unit: 'bar', status: 'high' },
            speed: { value: 1650, unit: 'rpm', status: 'normal' }
          },
          maintenanceHistory: [
            { date: '2024-05-05', type: 'Emergency Repair', cost: 5600 },
            { date: '2024-02-18', type: 'Routine Inspection', cost: 1200 }
          ]
        },
        { 
          name: 'Inverter103', health: 85, status: 'good', rul: 80,
          type: 'Solar Inverter', installDate: '2020-09-14', operatingHours: 16200,
          lastMaintenance: '25 days ago',
          sensors: {
            temperature: { value: 58, unit: '°C', status: 'normal' },
            vibration: { value: 3.1, unit: 'mm/s', status: 'normal' },
            pressure: { value: 6.2, unit: 'bar', status: 'normal' },
            speed: { value: 3200, unit: 'rpm', status: 'normal' }
          },
          maintenanceHistory: [
            { date: '2024-06-10', type: 'Software Update', cost: 800 },
            { date: '2024-05-01', type: 'Calibration', cost: 1500 }
          ]
        },
        { 
          name: 'Inverter104', health: 78, status: 'warning', rul: 60,
          type: 'Solar Inverter', installDate: '2020-09-14', operatingHours: 16800,
          lastMaintenance: '30 days ago',
          sensors: {
            temperature: { value: 71, unit: '°C', status: 'high' },
            vibration: { value: 6.7, unit: 'mm/s', status: 'normal' },
            pressure: { value: 6.5, unit: 'bar', status: 'normal' },
            speed: { value: 3150, unit: 'rpm', status: 'normal' }
          },
          maintenanceHistory: [
            { date: '2024-06-05', type: 'Routine Inspection', cost: 1200 },
            { date: '2024-03-22', type: 'Motor Replacement', cost: 6800 }
          ]
        },
      ];

      const kpiCards = [
        { title: 'Overall OEE', value: '20.2%', change: '+2.3%', trend: 'up', icon: Activity, color: 'blue' },
        { title: 'Forecast Accuracy', value: '91.5%', change: '+5.1%', trend: 'up', icon: TrendingUp, color: 'green' },
        { title: 'Active Machines', value: '5/6', change: '1 under maintenance', trend: 'neutral', icon: Factory, color: 'purple' },
        { title: 'Critical Alerts', value: '3', change: '2 new today', trend: 'down', icon: AlertTriangle, color: 'red' },
      ];

      const unreadCount = alerts.filter(a => !a.read).length;

      const getSeverityIcon = (severity) => {
        switch(severity) {
          case 'critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
          case 'high': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
          case 'medium': return <Clock className="w-5 h-5 text-yellow-500" />;
          default: return <Bell className="w-5 h-5 text-blue-500" />;
        }
      };

      const markAllAsRead = () => {
        setAlerts(alerts.map(alert => ({ ...alert, read: true })));
      };

      const markAsRead = (id) => {
        setAlerts(alerts.map(alert => 
          alert.id === id ? { ...alert, read: true } : alert
        ));
      };

      const deleteAlert = (id) => {
        setAlerts(alerts.filter(alert => alert.id !== id));
        setSuccessMessage(currentLang.alertDeleted);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      };

       
      const deleteAllAlerts = () => {
        if (confirm(language === 'th' ? 'ต้องการลบการแจ้งเตือนทั้งหมดหรือไม่?' : 'Delete all alerts?')) {
          setAlerts([]);
          setSuccessMessage(language === 'th' ? 'ลบการแจ้งเตือนทั้งหมดแล้ว' : 'All alerts deleted');
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
        }
      };

      const filteredAlerts = alerts.filter(alert => {
        const matchFilter = 
          alertFilter === 'all' ? true :
          alertFilter === 'unread' ? !alert.read :
          alertFilter === 'read' ? alert.read :
          alert.severity === alertFilter;
        
        const matchSearch = 
          alertSearch === '' ? true :
          alert.machine.toLowerCase().includes(alertSearch.toLowerCase()) ||
          alert.message.toLowerCase().includes(alertSearch.toLowerCase());
        
        return matchFilter && matchSearch;
      });

      const handleGenerateForecast = async () => {
        setShowForecastModal(false);
        setIsProcessing(true);
        setProcessingMessage('Generating demand forecast...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        setIsProcessing(false);
        setSuccessMessage(`Forecast generated successfully! Horizon: ${forecastParams.horizon} days, MAPE: 8.3%`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      };

      const handleOptimizeSchedule = async () => {
        setShowPlanningModal(false);
        setIsProcessing(true);
        setProcessingMessage('Optimizing production schedule...');
        await new Promise(resolve => setTimeout(resolve, 4000));
        setIsProcessing(false);
        setSuccessMessage('Production schedule optimized! Total cost: $125,000, Utilization: 87%');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      };

      const handleRunAnalysis = async () => {
        setShowAnalysisModal(false);
        setIsProcessing(true);
        setProcessingMessage('Running predictive maintenance analysis...');
        await new Promise(resolve => setTimeout(resolve, 3500));
        setIsProcessing(false);
        setSuccessMessage('Analysis completed! 2 machines require attention within 30 days');
        setShowSuccessMessage(true);
        const newAlert = {
          id: Date.now(),
          type: 'warning',
          machine: 'CNC-001',
          message: 'Analysis complete: Inspection recommended within 14 days',
          time: 'Just now',
          severity: 'high',
          read: false
        };
        setAlerts([newAlert, ...alerts]);
        setTimeout(() => setShowSuccessMessage(false), 5000);
      };

      const handleLogout = async () => {
        if (window.firebase && window.firebase.auth()) {
          try {
            await window.firebase.auth().signOut();
            if (onLogout) onLogout();
          } catch (error) {
            console.error('Logout error:', error);
          }
        } else {
          if (onLogout) onLogout();
        }
      };

      const handleOpenSchedule = (machine, type) => {
        setSelectedMachine(machine);
        setScheduleType(type);
        setShowScheduleModal(true);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setScheduleForm({
          ...scheduleForm,
          date: tomorrow.toISOString().split('T')[0],
          priority: type === 'urgent' ? 'high' : 'medium'
        });
      };

      const handleScheduleSubmit = async () => {
        setShowScheduleModal(false);
        setIsProcessing(true);
        setProcessingMessage(currentLang.processing);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsProcessing(false);
        setSuccessMessage(`${currentLang.scheduleSuccessMessage} - ${selectedMachine.name} on ${scheduleForm.date}`);
        setShowSuccessMessage(true);
        const newAlert = {
          id: Date.now(),
          type: 'info',
          machine: selectedMachine.name,
          message: `${scheduleType === 'urgent' ? currentLang.urgentMaintenance : currentLang.routineInspection} ${language === 'th' ? 'นัดหมายแล้ว' : 'scheduled'} - ${scheduleForm.date}`,
          time: language === 'th' ? 'เมื่อสักครู่' : 'Just now',
          severity: scheduleType === 'urgent' ? 'high' : 'medium',
          read: false
        };
        setAlerts([newAlert, ...alerts]);
        setTimeout(() => setShowSuccessMessage(false), 5000);
        setScheduleForm({ date: '', time: '', technician: '', priority: 'medium', notes: '' });
      };
      const [sidebarOpen, setSidebarOpen] = useState(false);

      return (

        <div className={`min-h-screen ${theme === 'dark' ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 to-slate-100'}`}>      
          
          {/* Header */}
          <header className={`border-b shadow-sm sticky top-0 z-50 transition-all duration-200 ${theme === 'dark' ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'} backdrop-blur-md`}>
            {(showNotifications || showUserMenu) && (
              <div className="fixed inset-0 z-0 bg-transparent" onClick={() => { setShowNotifications(false); setShowUserMenu(false); }}></div>
            )}
            <div className="max-w-9xl mx-auto px-15 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  
                  <button
                    onClick={() => setSidebarOpen(true)}
                    className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    <svg className="w-10 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>

                  <div className="p-1.5 rounded-xl shadow-md shrink-1">
                    <img 
                      src="https://github.com/jirayuschompen/smart-manufacturing-dashboard/blob/main/src/assets/Sunthesiz.png?raw=true" 
                      alt="Sunthesiz Logo"
                      className="w-9 h-9 lg:w-10 lg:h-10 object-contain"
                    />
                    </div>
                  <div className="flex flex-col">
                    <h1 className={`text-base lg:text-xl font-bold leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                      {currentLang.title}
                    </h1>
                    <p className={`text-[10px] lg:text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} font-medium hidden sm:block mt-1`}>
                      {currentLang.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 lg:gap-3">

                  <div className="relative z-10">
                    <button 
                      onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                      className={`relative p-2.5 rounded-full transition-all active:scale-95 ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                      <Bell className="w-5 h-5 lg:w-6 lg:h-6" />
                      {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-800 animate-pulse"></span>}
                    </button>
                    {showNotifications && (
                      <div className={`absolute right-[-50px] sm:right-0 mt-3 w-[90vw] sm:w-80 lg:w-96 origin-top-right transform transition-all rounded-2xl shadow-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`p-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
                          <h3 className={`font-semibold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{currentLang.notifications}</h3>
                          <button onClick={markAllAsRead} className="text-xs font-medium text-blue-500 hover:text-blue-600 px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-slate-700 transition">{currentLang.markAllRead}</button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                          {alerts.slice(0, 5).map((alert) => (
                            <div key={alert.id} onClick={() => markAsRead(alert.id)} className={`p-4 border-b last:border-b-0 cursor-pointer transition-colors ${!alert.read ? (theme === 'dark' ? 'bg-blue-900/10 border-slate-700' : 'bg-blue-50/50 border-slate-100') : (theme === 'dark' ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-100')}`}>
                              <div className="flex gap-3 items-start">
                                <div className="mt-0.5 shrink-0">{getSeverityIcon(alert.severity)}</div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex justify-between items-start mb-0.5">
                                    <p className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{alert.machine}</p>
                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{alert.time}</span>
                                  </div>
                                  <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{alert.message}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className={`p-3 text-center border-t ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-slate-50'}`}><button onClick={() => { setShowNotifications(false); setShowAllAlerts(true); }} className="text-xs font-medium text-blue-600 hover:text-blue-700 w-full py-1">{currentLang.viewAll}</button></div>
                      </div>
                    )}
                  </div>
                  {/* <div className="relative z-10"> */}
                    {/* <button 
                      onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                      className={`flex items-center gap-2 p-1.5 lg:px-3 lg:py-2 rounded-full transition-all border ${theme === 'dark' ? 'bg-slate-700 border-slate-600 hover:border-slate-500' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                    >
                      <div className="w-7 h-7 lg:w-8 lg:h-8 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">A</div>
                      <span className={`text-xs font-medium hidden md:block pr-1 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>Admin</span>
                      <ChevronRight className={`w-3 h-3 hidden md:block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-400'}`} />
                    </button>
                    {showUserMenu && (
                      <div className={`absolute right-0 mt-3 w-[85vw] sm:w-72 origin-top-right transform transition-all rounded-2xl shadow-2xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`p-5 border-b ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-100 bg-white'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">A</div>
                            <div>
                              <p className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Admin User</p>
                              <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Super Admin</p>
                            </div>
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {[ { icon: User, label: currentLang.profile }, { icon: Settings, label: currentLang.settings }, { icon: Shield, label: currentLang.security }, { icon: FileText, label: currentLang.apiDocs } ].map((item, idx) => (
                            <button key={idx} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition-colors ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                              <item.icon className="w-4 h-4 opacity-70" />{item.label}
                            </button>
                          ))}
                        </div>
                        <div className={`p-4 border-t space-y-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
                          <div className="grid grid-cols-2 gap-3">
                            <div className={`p-1 rounded-lg flex ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
                              <button onClick={() => setLanguage('th')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${language === 'th' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>TH</button>
                              <button onClick={() => setLanguage('en')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>EN</button>
                            </div>
                            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-lg border transition-all ${theme === 'dark' ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-white text-slate-600'}`}>{theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}</button>
                          </div>
                          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-colors"><LogOut className="w-4 h-4" />{currentLang.logout}</button>
                        </div>
                      </div>
                    )} */}
                  {/* </div> */}
                </div>
              </div>
            </div>
          </header>

          {/* ── Sidebar Overlay ── */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          
          {/* ── Sidebar Panel ── */}
          <div className={`fixed top-0 left-0 h-full w-64 z-50 shadow-2xl flex flex-col
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            ${theme === 'dark' ? 'bg-slate-900 border-r border-slate-700' : 'bg-white border-r border-slate-200'}`}
          >
            {/* Sidebar Header */}
            <div className={`flex items-center justify-between px-5 py-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
              <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Navigation</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className={`p-1.5 rounded-lg transition ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          
            {/* Sidebar Nav Items */}
            <nav className="flex-1 p-3 space-y-1">
              {[
                { id: 'fleet',        label: 'Fleet Map',                      icon: Map        },
                { id: 'overview',     label: currentLang.overview,             icon: Activity  },
                { id: 'forecast',     label: currentLang.demandForecasting,    icon: TrendingUp },
                { id: 'maintenance',  label: currentLang.predictiveMaintenance, icon: Settings  },
                { id: 'planning',     label: currentLang.productionPlanning,   icon: Calendar  },
              ].filter((tab) => ENABLED_TABS.includes(tab.id)).map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                        setActiveTab(tab.id);
                        setSidebarOpen(false);
                        if (tab.id === 'overview') {
                          setSelectedPlantId(null);
                          setSelectedPlantData(null);
                        }
                      }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all
                      ${isActive
                        ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'bg-blue-600 text-white shadow-md shadow-blue-200')
                        : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900')
                      }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'scale-110' : ''} transition-transform`} />
                    <span>{tab.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-70" />}
                  </button>
                );
              })}
            </nav>
            
            {/* ── Sidebar Bottom: User + Settings + Logout ── */}
  <div className={`px-4 py-4 border-t space-y-3 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>

    {/* Admin info */}
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md flex-shrink-0">A</div>
      <div className="min-w-0">
        <p className={`text-sm font-bold leading-none ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Admin User</p>
        <p className={`text-[11px] mt-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Super Admin</p>
      </div>
    </div>

    {/* Language + Theme */}
    <div className="grid grid-cols-2 gap-2">
      <div className={`p-1 rounded-lg flex ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <button onClick={() => setLanguage('th')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${language === 'th' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>TH</button>
        <button onClick={() => setLanguage('en')} className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${language === 'en' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>EN</button>
      </div>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className={`flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold rounded-lg border transition-all ${theme === 'dark' ? 'border-slate-600 hover:bg-slate-700 text-slate-300' : 'border-slate-300 hover:bg-white text-slate-600'}`}>
        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
      </button>
    </div>

    {/* Logout */}
    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition">
      <LogOut className="w-3.5 h-3.5" /> Logout
    </button>

  </div>
          </div>            

          {/* Navigation Tabs */}
          {/* <div className={`sticky z-40 border-b transition-all duration-300 ${theme === 'dark' ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-slate-200'} backdrop-blur-sm top-[60px] lg:top-[76px]`}>
            <div className="max-w-8xl mx-auto px-16">
              <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                <div className="flex min-w-full px-2 lg:px-6">
                  {[ { id: 'overview', label: 'Overview', icon: Activity }, { id: 'forecast', label: 'Demand Forecasting', icon: TrendingUp },{ id: 'maintenance', label: 'Predictive Maintenance', icon: Settings } ,{ id: 'planning', label: 'Production Planning', icon: Calendar } ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-none flex items-center gap-2 px-4 py-3 lg:px-6 lg:py-4 border-b-2 transition-all whitespace-nowrap text-sm lg:text-base font-medium select-none ${isActive ? 'border-blue-500 text-blue-600 ' + (theme === 'dark' ? 'bg-slate-800' : 'bg-blue-50/50') : 'border-transparent ' + (theme === 'dark' ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50')}`}>
                        <Icon className={`w-4 h-4 lg:w-5 lg:h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                        <span>{tab.id === 'overview' ? currentLang.overview : tab.id === 'forecast' ? currentLang.demandForecasting : tab.id === 'planning' ? currentLang.productionPlanning : currentLang.predictiveMaintenance}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div> */}

          {/* Main Content */}
          <main className="max-w-8xl mx-auto px-20 py-2">
            {/* Fleet Map page is disabled. FleetOverviewPage stays mounted in headless mode (no UI)
                only to feed plant / weather / fleet data to Overview. */}
            <FleetOverviewPage
              headless
              theme={theme}
              onFleetDataUpdate={setFleetSummary}
              onWeatherUpdate={setPlantWeather}
              onPlantDataUpdate={setAllPlantsData}
            />
            {/* -- Overview Tab -- */}
            {activeTab === 'overview' && (
            <div className="space-y-8">
              <Overview 
                theme={theme}
                currentLang={currentLang}
                weatherData={selectedPlantId ? (plantWeather[selectedPlantId] ?? null) : null}
                kpiCards={kpiCards}
                productionDataSets={productionDataSets}
                productionPeriod={productionPeriod}
                setProductionPeriod={setProductionPeriod}
                demandDataSets={demandDataSets}
                demandPeriod={demandPeriod}
                setDemandPeriod={setDemandPeriod}
                alerts={alerts}
                unreadCount={unreadCount}
                markAsRead={markAsRead}
                markAllAsRead={markAllAsRead}
                deleteAllAlerts={deleteAllAlerts}
                deleteAlert={deleteAlert}
                machineHealth={machineHealth}
                setSelectedMachine={setSelectedMachine}
                setShowMachineDetail={setShowMachineDetail}
                showAllAlerts={showAllAlerts}
                setShowAllAlerts={setShowAllAlerts}
                alertSearch={alertSearch}
                setAlertSearch={setAlertSearch}
                alertFilter={alertFilter}
                setAlertFilter={setAlertFilter}
                filteredAlerts={filteredAlerts}
                plantId={selectedPlantId}
                activePlantData={(selectedPlantId && allPlantsData.find(x => x.id === selectedPlantId)) || selectedPlantData}
                fleetSummary={fleetSummary}
                allPlantsData={allPlantsData}
                onEnterDashboard={(plantId, plantData) => {     // ← เพิ่มบรรทัดนี้
                  setSelectedPlantId(plantId);
                  setSelectedPlantData(plantData);
                }}
                plantWeather={plantWeather}

                // onBackToFleet={() => {
                // setActiveTab('fleet');
                // }}

                onBackToFleet={() => {
                  setSelectedPlantId(null);
                  setSelectedPlantData(null);
                }}
                />

                {/* ─── Sungrow Live Data Panel ─── */}
                {/* <SungrowLivePanel theme={theme} /> */}
              </div>
            )}

            {/* --- Forecast Tab --- */}
            {activeTab === 'forecast' && (
              <Forecast 
                theme={theme}
                language={language}
                currentLang={currentLang}
                demandDataSets={demandDataSets} 
                demandPeriod={demandPeriod}
                setDemandPeriod={setDemandPeriod}
                setShowForecastModal={setShowForecastModal}
              />
            )}

            {/* --- Maintenance Tab --- */}
            {activeTab === 'maintenance' && ENABLED_TABS.includes('maintenance') && (
              <Maintenance 
                theme={theme}
                currentLang={currentLang}
                machineHealth={machineHealth}
                setShowAnalysisModal={setShowAnalysisModal}
                handleOpenSchedule={handleOpenSchedule}
                setSelectedMachine={setSelectedMachine}
                setShowMachineDetail={setShowMachineDetail}
              />
            )}

            {/* --- Planning Tab --- */}
            {activeTab === 'planning' && ENABLED_TABS.includes('planning') && (
              <Planning 
                  theme={theme}
                  language={language}
                  currentLang={currentLang}
                  setShowPlanningModal={setShowPlanningModal}
                  machineHealth={machineHealth}
                  handleOpenSchedule={handleOpenSchedule}
              />
            )}

          </main>

          {/* Footer */}
          <footer className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-t mt-12`}>
            <div className="max-w-7xl mx-auto px-6 py-4">
              <p className={`text-center text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                © 2025 Smart Manufacturing AI Platform | Powered by Advanced Predictive Analytics
              </p>
            </div>
          </footer>

          {/* --- MODALS --- */}
          
          {/* Forecast Modal */}
          {showForecastModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-lg rounded-xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#1e293b]' : 'bg-white'} zoom-in-95 duration-200`}>
                <div className={`px-6 py-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{currentLang.generateForecast}</h3>
                  <button onClick={() => setShowForecastModal(false)} className={`p-1 rounded-full hover:bg-slate-100 transition ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500'}`}><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-5">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{language === 'th' ? 'ระยะเวลาการพยากรณ์ (วัน)' : 'Forecast Horizon (Days)'}</label>
                    <input type="number" value={forecastParams.horizon} onChange={(e) => setForecastParams({...forecastParams, horizon: parseInt(e.target.value)})} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Products</label>
                    <div className="space-y-2">
                      {['PROD-001', 'PROD-002', 'PROD-003'].map((prod) => (
                        <label key={prod} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={forecastParams.products.includes(prod)} onChange={(e) => { const newProducts = e.target.checked ? [...forecastParams.products, prod] : forecastParams.products.filter(p => p !== prod); setForecastParams({...forecastParams, products: newProducts}); }} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                          <span className={`text-sm group-hover:opacity-80 transition ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{prod}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Confidence Level</label>
                    <select value={forecastParams.confidenceLevel} onChange={(e) => setForecastParams({...forecastParams, confidenceLevel: parseFloat(e.target.value)})} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                      <option value={0.90}>90%</option><option value={0.95}>95%</option><option value={0.99}>99%</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={forecastParams.includeConfidence} onChange={(e) => setForecastParams({...forecastParams, includeConfidence: e.target.checked})} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className={`text-sm font-medium group-hover:opacity-80 transition ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Include confidence intervals</span>
                  </label>
                </div>
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                  <button onClick={() => setShowForecastModal(false)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-white hover:shadow-sm'}`}>{currentLang.cancel}</button>
                  <button onClick={handleGenerateForecast} className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-md transition hover:shadow-lg hover:-translate-y-0.5">{currentLang.generateForecast}</button>
                </div>
              </div>
            </div>
          )}

          {/* Planning Modal */}
          {showPlanningModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className={`w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden ${theme === 'dark' ? 'bg-[#1e293b]' : 'bg-white'} zoom-in-95 duration-200`}>
                <div className={`px-6 py-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                  <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Optimize Production Schedule</h3>
                  <button onClick={() => setShowPlanningModal(false)} className={`p-1 rounded-full hover:bg-slate-100 transition ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500'}`}><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Start Date</label>
                      <input type="date" value={planningParams.startDate} onChange={(e) => setPlanningParams({...planningParams, startDate: e.target.value})} className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                    </div>
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>End Date</label>
                      <input type="date" value={planningParams.endDate} onChange={(e) => setPlanningParams({...planningParams, endDate: e.target.value})} className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Optimization Objective</label>
                    <select value={planningParams.objective} onChange={(e) => setPlanningParams({...planningParams, objective: e.target.value})} className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                      <option value="minimize_cost">Minimize Production Cost</option>
                      <option value="maximize_output">Maximize Output</option>
                      <option value="balance_load">Balance Machine Load</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Constraints Profile</label>
                    <select value={planningParams.constraints} onChange={(e) => setPlanningParams({...planningParams, constraints: e.target.value})} className={`w-full px-4 py-2.5 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                      <option value="standard">Standard Constraints</option>
                      <option value="strict">Strict Deadlines</option>
                      <option value="flexible">Flexible Resource Allocation</option>
                    </select>
                  </div>
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-800 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                    <p className="text-sm"><span className="font-bold">Note:</span> Optimization may take 3-5 minutes depending on complexity. You'll receive a notification when complete.</p>
                  </div>
                </div>
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                  <button onClick={() => setShowPlanningModal(false)} className={`px-6 py-2.5 rounded-lg text-sm font-medium border transition ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-white hover:shadow-sm'}`}>Cancel</button>
                  <button onClick={handleOptimizeSchedule} className="px-6 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-md transition hover:shadow-lg hover:-translate-y-0.5">Start Optimization</button>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Modal */}
          {showAnalysisModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
              <div className={`${theme === 'dark' ? 'bg-[#1e293b]' : 'bg-white'} rounded-xl w-full shadow-2xl overflow-hidden`} style={{ maxWidth: '650px' }}>
                <div className={`px-6 py-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                  <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Run Predictive Analysis</h2>
                  <button onClick={() => setShowAnalysisModal(false)} className={`p-1 rounded-full hover:bg-slate-100 transition ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400'}`}><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Analysis Type</label>
                    <div className="space-y-3">
                      {[
                        { id: 'full', label: 'Full System Analysis (All Machines)', time: '~4 min' },
                        { id: 'critical', label: 'Critical Machines Only', time: '~2 min' },
                        { id: 'custom', label: 'Custom Selection', time: 'Variable' }
                      ].map((option) => (
                        <div key={option.id} onClick={() => setAnalysisParams({ ...analysisParams, type: option.id })} className={`relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ease-in-out ${analysisParams.type === option.id ? (theme === 'dark' ? 'border-blue-500 bg-blue-900/30' : 'border-blue-600 bg-blue-50') : (theme === 'dark' ? 'border-slate-700 hover:border-slate-600 bg-slate-800' : 'border-slate-200 hover:border-blue-300 bg-white')}`}>
                          <div className="flex items-center gap-3">
                            <div className={`flex items-center justify-center w-5 h-5 rounded-full border transition-all duration-200 ${analysisParams.type === option.id ? 'border-blue-600 bg-blue-600' : (theme === 'dark' ? 'border-slate-500 bg-transparent' : 'border-slate-300 bg-white')}`}>
                              {analysisParams.type === option.id && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                            </div>
                            <span className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>{option.label}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-md ${theme === 'dark' ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{option.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Prediction Horizon</label>
                    <select value={analysisParams.horizon} onChange={(e) => setAnalysisParams({...analysisParams, horizon: e.target.value})} className={`w-full px-4 py-2.5 rounded-lg border outline-none appearance-none transition ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'}`}>
                      <option value="7">Next 7 days</option><option value="14">Next 14 days</option><option value="30">Next 30 days</option><option value="90">Next 3 months</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-3 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Analysis Options</label>
                    <div className="space-y-3">
                      {[
                        { key: 'anomaly', label: 'Include anomaly detection' },
                        { key: 'maintenance', label: 'Generate maintenance recommendations' },
                        { key: 'cost', label: 'Calculate cost impact' },
                        { key: 'report', label: 'Export detailed report (PDF)' },
                      ].map((opt) => (
                        <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${analysisParams.options[opt.key] ? 'bg-blue-600 border-blue-600' : theme === 'dark' ? 'border-slate-500 bg-slate-800' : 'border-gray-300 bg-white'}`}>
                            {analysisParams.options[opt.key] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            <input type="checkbox" className="hidden" checked={analysisParams.options[opt.key]} onChange={(e) => setAnalysisParams({...analysisParams, options: { ...analysisParams.options, [opt.key]: e.target.checked }})} />
                          </div>
                          <span className={`text-sm ${theme === 'dark' ? 'text-slate-300 group-hover:text-white' : 'text-slate-600 group-hover:text-slate-900'}`}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                  <button onClick={() => setShowAnalysisModal(false)} className={`px-6 py-2.5 rounded-lg text-sm font-medium border transition ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-white hover:shadow-sm'}`}>Cancel</button>
                  <button onClick={handleRunAnalysis} className="px-6 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-md transition hover:shadow-lg hover:-translate-y-0.5">Run Analysis</button>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Modal */}
          {showScheduleModal && selectedMachine && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
              <div className={`${theme === 'dark' ? 'bg-[#1e293b]' : 'bg-white'} rounded-xl w-full shadow-2xl overflow-hidden`} style={{ maxWidth: '600px' }}>
                <div className={`px-6 py-4 border-b flex items-start justify-between ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                  <div>
                    <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{scheduleType === 'urgent' ? currentLang.urgentMaintenance : currentLang.routineInspection}</h2>
                    <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{selectedMachine.name} - {selectedMachine.type}</p>
                  </div>
                  <button onClick={() => setShowScheduleModal(false)} className={`p-1 rounded-full hover:bg-slate-100 transition ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400'}`}><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 space-y-5">
                  {scheduleType === 'urgent' && (
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 flex gap-3 items-start">
                      <div className="mt-0.5 p-1 bg-red-100 rounded-full"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
                      <div><h4 className="text-sm font-bold text-red-700">Urgent Action Required!</h4><p className="text-xs text-red-600 mt-1">Machine has high risk of failure. Recommended action within 7 days</p></div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Select Date</label>
                      <input type="date" value={scheduleForm.date} onChange={(e) => setScheduleForm({...scheduleForm, date: e.target.value})} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Select Time <span className="text-red-500">*</span></label>
                      <input type="time" value={scheduleForm.time} onChange={(e) => setScheduleForm({...scheduleForm, time: e.target.value})} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`} />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Assign Technician <span className="text-red-500">*</span></label>
                    <select value={scheduleForm.technician} onChange={(e) => setScheduleForm({...scheduleForm, technician: e.target.value})} className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
                      <option value="">{currentLang.selectTechnician}</option>
                      <option value="tech1">Sarah Connor (Senior)</option>
                      <option value="tech2">John Doe (Junior)</option>
                      <option value="tech3">Mike Ross (Specialist)</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Priority</label>
                    <div className="flex gap-3">
                      {['Low', 'Medium', 'High'].map((level) => (
                        <button key={level} onClick={() => setScheduleForm({...scheduleForm, priority: level.toLowerCase()})} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${scheduleForm.priority === level.toLowerCase() ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-600 ring-offset-1' : theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{level}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Additional Notes</label>
                    <textarea rows="3" placeholder="Specify details, symptoms found, or special requests..." className={`w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none resize-none transition ${theme === 'dark' ? 'bg-slate-800 border-slate-600 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'}`}></textarea>
                  </div>
                  <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                    <h4 className={`text-sm font-bold mb-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>Appointment Summary</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex"><span className={`w-20 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Machine:</span><span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{selectedMachine.name}</span></div>
                      <div className="flex"><span className={`w-20 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Type:</span><span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{scheduleType === 'urgent' ? 'Urgent Maintenance' : 'Routine Inspection'}</span></div>
                      <div className="flex"><span className={`w-20 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Date:</span><span className={`font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{scheduleForm.date || '-'}</span></div>
                      <div className="flex items-center"><span className={`w-20 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Priority:</span><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${scheduleForm.priority === 'high' ? 'bg-red-100 text-red-700' : scheduleForm.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-700'}`}>{scheduleForm.priority || 'Medium'}</span></div>
                    </div>
                  </div>
                </div>
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${theme === 'dark' ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
                  <button onClick={() => setShowScheduleModal(false)} className={`px-6 py-2 rounded-lg text-sm font-medium border transition ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-600 hover:bg-white hover:shadow-sm'}`}>{currentLang.cancel}</button>
                  <button onClick={handleScheduleSubmit} disabled={!scheduleForm.technician || !scheduleForm.time} className={`px-6 py-2 rounded-lg text-sm font-medium shadow-md transition-all ${!scheduleForm.technician || !scheduleForm.time ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:-translate-y-0.5'} ${theme === 'dark' ? 'bg-slate-600 text-white' : ''}`} style={!scheduleForm.technician || !scheduleForm.time ? (theme === 'dark' ? {} : { backgroundColor: '#b4c4d6', color: '#475569' }) : (theme === 'dark' ? {} : { backgroundColor: '#2563eb', color: '#fff' })}>{currentLang.confirmSchedule}</button>
                </div>
              </div>
            </div>
          )}

          {/* Machine Detail Modal */}
          {showMachineDetail && selectedMachine && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
              <div className={`${theme === 'dark' ? 'bg-[#0f172a]' : 'bg-slate-50'} rounded-xl w-full shadow-2xl overflow-hidden flex flex-col`} style={{ maxWidth: '1000px', maxHeight: '90vh' }}>
                <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-50'}`}><Factory className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /></div>
                    <div>
                      <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>{selectedMachine.name}</h2>
                      <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{selectedMachine.type}</p>
                    </div>
                  </div>
                  <button onClick={() => setShowMachineDetail(false)} className={`p-2 rounded-full hover:bg-slate-100 transition ${theme === 'dark' ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400'}`}><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-xl shadow-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                      <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Health Score</p>
                      <p className={`text-3xl font-bold ${selectedMachine.health >= 80 ? 'text-green-500' : selectedMachine.health >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>{selectedMachine.health}%</p>
                    </div>
                    <div className={`p-4 rounded-xl shadow-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                      <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>RUL</p>
                      <p className="text-3xl font-bold text-blue-600">{selectedMachine.rul}</p>
                      <p className="text-[10px] text-slate-400">days</p>
                    </div>
                    <div className={`p-4 rounded-xl shadow-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                      <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Operating Hours</p>
                      <p className="text-3xl font-bold text-purple-600">{selectedMachine.operatingHours.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400">hours</p>
                    </div>
                    <div className={`p-4 rounded-xl shadow-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                      <p className={`text-xs font-semibold mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold capitalize ${selectedMachine.status === 'good' ? 'bg-green-100 text-green-700' : selectedMachine.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{selectedMachine.status}</span>
                    </div>
                  </div>
                  <div className={`p-5 rounded-xl shadow-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className={`text-sm font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Machine Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div><p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Machine Type</p><p className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{selectedMachine.type}</p></div>
                      <div><p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Install Date</p><p className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{selectedMachine.installDate}</p></div>
                      <div><p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Last Maintenance</p><p className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{selectedMachine.lastMaintenance}</p></div>
                      <div><p className={`text-xs mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Failure Probability (30d)</p><p className={`font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>2%</p></div>
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Sensor Data</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {Object.entries(selectedMachine.sensors).map(([key, data]) => (
                        <div key={key} className={`p-4 rounded-xl shadow-sm border-l-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} ${data.status === 'normal' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                          <p className={`text-xs font-semibold capitalize mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{key}</p>
                          <div className="flex items-baseline gap-1"><span className={`text-2xl font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{data.value}</span><span className="text-xs text-slate-400">{data.unit || ''}</span></div>
                          <span className={`mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${data.status === 'normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{data.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Maintenance History</h3>
                    <div className={`rounded-xl shadow-sm overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-white'}`}>
                      {selectedMachine.maintenanceHistory.map((item, idx) => (
                        <div key={idx} className={`p-4 flex items-center justify-between border-b last:border-0 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}><Settings className="w-5 h-5" /></div>
                            <div><p className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-900'}`}>{item.type}</p><p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{item.date}</p></div>
                          </div>
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>${item.cost.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={`p-4 rounded-xl border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                    <div className="flex items-center gap-2 mb-2"><Activity className={`w-5 h-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} /><h3 className={`text-sm font-bold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>Recommendations</h3></div>
                    <div className="space-y-1 pl-7">
                      <div className="flex items-center gap-2"><Check className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} /><p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Continue routine maintenance</p></div>
                      <div className="flex items-center gap-2"><Check className={`w-4 h-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`} /><p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>Machine condition is optimal</p></div>
                    </div>
                  </div>
                </div>
                <div className={`px-6 py-4 border-t flex justify-between items-center ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${theme === 'dark' ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}><Download className="w-4 h-4" />{currentLang.exportReport}</button>
                  <div className="flex gap-3">
                    <button onClick={() => handleOpenSchedule(selectedMachine, 'inspection')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition"><Calendar className="w-4 h-4" />{currentLang.scheduleMaintenance}</button>
                    <button onClick={() => setShowMachineDetail(false)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${theme === 'dark' ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{currentLang.close}</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg flex flex-col items-center">
                <Loader className="animate-spin w-8 h-8 text-blue-600 mb-2" />
                <p>{processingMessage}</p>
              </div>
            </div>
          )}

          {/* Success Toast */}
          {showSuccessMessage && (
            <div className="fixed top-20 right-6 bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 z-50">
              <CheckCircle className="w-6 h-6" />
              <p>{successMessage}</p>
            </div>
          )}

        </div>
      );
    };

    export default App;