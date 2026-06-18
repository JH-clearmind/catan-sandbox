const { useState, useEffect, createElement: e } = React;

// --- 1. 核心数据与配置 ---
const HEX_SIZE = 55; // 稍微调小一点以适应三栏布局

// 更新为参考图中更柔和、现代的配色
const RESOURCES = {
    WOOD: { id: 'wood', name: '森林', color: '#2c5e2e' },     // 深绿
    BRICK: { id: 'brick', name: '丘陵', color: '#b94a2b' },    // 陶红
    SHEEP: { id: 'sheep', name: '牧场', color: '#7fb03b' },    // 浅草绿
    WHEAT: { id: 'wheat', name: '麦田', color: '#dfa629' },    // 麦黄
    ORE: { id: 'ore', name: '矿山', color: '#686b6a' },      // 灰岩
    DESERT: { id: 'desert', name: '沙漠', color: '#d9c69d' }   // 浅沙色
};

const RESOURCES_ARRAY = Object.values(RESOURCES);

const STANDARD_TILES = [
    ...Array(4).fill(RESOURCES.WOOD),
    ...Array(3).fill(RESOURCES.BRICK),
    ...Array(4).fill(RESOURCES.SHEEP),
    ...Array(4).fill(RESOURCES.WHEAT),
    ...Array(3).fill(RESOURCES.ORE),
    RESOURCES.DESERT
];

const STANDARD_NUMBERS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

const HEX_COORDS = [
  {q: 0, r: -2}, {q: 1, r: -2}, {q: 2, r: -2},
  {q: -1, r: -1}, {q: 0, r: -1}, {q: 1, r: -1}, {q: 2, r: -1},
  {q: -2, r: 0}, {q: -1, r: 0}, {q: 0, r: 0}, {q: 1, r: 0}, {q: 2, r: 0},
  {q: -2, r: 1}, {q: -1, r: 1}, {q: 0, r: 1}, {q: 1, r: 1},
  {q: -2, r: 2}, {q: -1, r: 2}, {q: 0, r: 2}
];

// --- 2. 核心算法 ---
function hexDistance(a, b) {
    return Math.max(
        Math.abs(a.q - b.q),
        Math.abs(a.r - b.r),
        Math.abs((-a.q - a.r) - (-b.q - b.r))
    );
}

function shuffle(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// === 核心校验算法集合 ===

function check68Rule(board) {
    const reds = board.filter(t => t.number === 6 || t.number === 8);
    for (let i = 0; i < reds.length; i++) {
        for (let j = i + 1; j < reds.length; j++) {
            if (hexDistance(reds[i], reds[j]) === 1) return false;
        }
    }
    return true;
}

function checkSameNumberRule(board) {
    const withNums = board.filter(t => t.number !== null);
    for (let i = 0; i < withNums.length; i++) {
        for (let j = i + 1; j < withNums.length; j++) {
            // 如果数字相同，且距离为1，则违规
            if (withNums[i].number === withNums[j].number && hexDistance(withNums[i], withNums[j]) === 1) {
                return false;
            }
        }
    }
    return true;
}

function checkSameResourceRule(board) {
    for (let i = 0; i < board.length; i++) {
        for (let j = i + 1; j < board.length; j++) {
            // 如果资源类型相同（除了沙漠），且距离为1，则违规
            if (board[i].resource.id !== 'desert' && 
                board[i].resource.id === board[j].resource.id && 
                hexDistance(board[i], board[j]) === 1) {
                return false;
            }
        }
    }
    return true;
}

function check2And12Rule(board) {
    const extremes = board.filter(t => t.number === 2 || t.number === 12);
    for (let i = 0; i < extremes.length; i++) {
        for (let j = i + 1; j < extremes.length; j++) {
            if (hexDistance(extremes[i], extremes[j]) === 1) return false;
        }
    }
    return true;
}

// 综合校验函数
function isBoardValid(board, constraints) {
    if (constraints.noAdjacent68 && !check68Rule(board)) return false;
    if (constraints.noAdjacentSameNumber && !checkSameNumberRule(board)) return false;
    if (constraints.noAdjacentSameResource && !checkSameResourceRule(board)) return false;
    if (constraints.noAdjacent2And12 && !check2And12Rule(board)) return false;
    return true;
}

// 辅助函数：判断一个坐标是否在边缘
function isEdgeCoord(coord) {
    return Math.abs(coord.q) === 2 || Math.abs(coord.r) === 2 || Math.abs(-coord.q - coord.r) === 2;
}

function generateValidBoard(constraints, desertPosOption) {
    let valid = false;
    let boardMap = [];
    let attempts = 0;
    const MAX_ATTEMPTS = 5000; 
    
    while (!valid && attempts < MAX_ATTEMPTS) {
        // 先把非沙漠的地形拿出来洗牌 (18张)
        let normalTiles = shuffle(STANDARD_TILES.filter(t => t.id !== 'desert'));
        let numbers = shuffle(STANDARD_NUMBERS);
        boardMap = [];
        let numIndex = 0;
        let normalTileIndex = 0;
        
        // 预设沙漠应该放置的坐标 (如果不是 random)
        let targetDesertCoord = null;
        if (desertPosOption === 'center') {
            targetDesertCoord = { q: 0, r: 0 };
        } else if (desertPosOption === 'edge') {
            const edges = HEX_COORDS.filter(isEdgeCoord);
            targetDesertCoord = edges[Math.floor(Math.random() * edges.length)];
        }
        
        for (let i = 0; i < HEX_COORDS.length; i++) {
            const coord = HEX_COORDS[i];
            let resource, number;

            // 决定这个格子放什么
            if (desertPosOption !== 'random' && targetDesertCoord && coord.q === targetDesertCoord.q && coord.r === targetDesertCoord.r) {
                // 如果用户指定了特定位置，且当前轮到了这个坐标，强制塞入沙漠
                resource = RESOURCES.DESERT;
                number = null;
            } else if (desertPosOption === 'random' && normalTileIndex === normalTiles.length) {
                // 原有的纯随机逻辑兼容
                resource = RESOURCES.DESERT;
                number = null;
            } else if (desertPosOption === 'random') {
                // 纯随机时的普通牌处理，为了完美随机，需要把沙漠混入 normalTiles。
                // 为了逻辑简单，这里稍微调整：我们在 random 时直接复用原始纯洗牌逻辑
                // （这行代码只有在 random 且洗到最后一张还不是沙漠时触发，实际不会执行，为了结构完整）
            } else {
                resource = normalTiles[normalTileIndex++];
                number = numbers[numIndex++];
            }
            
            boardMap.push({ ...coord, resource, number, id: i });
        }

        // 如果是 random 模式，我们直接把之前的暴力洗牌拿过来用最保险
        if (desertPosOption === 'random') {
             let allTiles = shuffle(STANDARD_TILES);
             let allNums = shuffle(STANDARD_NUMBERS);
             boardMap = [];
             let nIdx = 0;
             for (let i = 0; i < HEX_COORDS.length; i++) {
                 let r = allTiles[i];
                 let n = r.id === 'desert' ? null : allNums[nIdx++];
                 boardMap.push({ ...HEX_COORDS[i], resource: r, number: n, id: i });
             }
        }
        
        valid = isBoardValid(boardMap, constraints);
        attempts++;
    }
    
    if (!valid) {
        console.warn("Generation timed out.");
        boardMap.generationFailed = true; 
    }
    
    return boardMap;
}

function axialToPixel(q, r, size) {
    const x = size * Math.sqrt(3) * (q + r / 2);
    const y = size * 3 / 2 * r;
    return { x, y };
}

function getProbabilityDots(num) {
    if (!num) return 0;
    return 6 - Math.abs(7 - num);
}

// --- 3. UI 组件 ---

// 单个六边形组件
const Hexagon = ({ tile, size, onClick, isEditMode }) => {
    const { x, y } = axialToPixel(tile.q, tile.r, size);
    
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
    }

    const isRed = tile.number === 6 || tile.number === 8;
    const textColor = isRed ? '#d32f2f' : '#2c3e50';

    const elements = [
        e('polygon', { 
            key: 'poly',
            className: 'hexagon-poly',
            points: points.join(' '), 
            fill: tile.resource.color, 
        })
    ];

    if (tile.number) {
        elements.push(
            e('g', { key: 'numGroup' }, [
                // Token 背景
                e('circle', { key: 'circle', cx: '0', cy: '0', r: size * 0.45, className: 'token-bg' }),
                // 数字
                e('text', { key: 'num', x: '0', y: '5', textAnchor: 'middle', fill: textColor, fontWeight: '800', fontSize: '20', fontFamily: 'Arial, sans-serif' }, tile.number),
                // 概率点 (如果是红字也变红)
                e('text', { key: 'dots', x: '0', y: '16', textAnchor: 'middle', fontSize: '14', fill: textColor, fontWeight: '900', letterSpacing: '2px' }, '.'.repeat(getProbabilityDots(tile.number)))
            ])
        );
    }

    if (isEditMode) {
        elements.push(
            e('circle', { key: 'hover', cx: '0', cy: '0', r: size, fill: 'rgba(255,255,255,0.2)', className: 'hover-overlay', style: {opacity: 0} })
        );
    }

    return e('g', {
        transform: `translate(${x}, ${y})`,
        onClick: () => onClick(tile),
        style: { cursor: isEditMode ? 'pointer' : 'default', transition: 'transform 0.1s' },
        className: 'hexagon-group'
    }, elements);
};

// 主应用组件
const App = () => {
    const [board, setBoard] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);
    const [generationFailed, setGenerationFailed] = useState(false);
    
    // 沙漠位置状态管理 (center, edge, random)
    const [desertPos, setDesertPos] = useState('random');

    // 约束条件状态管理
    const [constraints, setConstraints] = useState({
        noAdjacentSameNumber: false,
        noAdjacentSameResource: false,
        noAdjacent68: true, // 默认开启硬核规则
        noAdjacent2And12: false
    });

    useEffect(() => {
        handleGenerate();
        const style = document.createElement('style');
        style.innerHTML = `
            .hexagon-group:hover .hover-overlay { opacity: 1 !important; }
            .hexagon-group:active { transform: scale(0.92); }
            /* 美化 Toggle 开关 */
            .toggle-container { display: flex; align-items: center; margin-bottom: 12px; cursor: pointer; }
            .toggle-switch { position: relative; width: 36px; height: 20px; background: #ccc; border-radius: 20px; transition: 0.3s; margin-right: 10px; flex-shrink: 0;}
            .toggle-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);}
            .toggle-on .toggle-switch { background: #27ae60; }
            .toggle-on .toggle-switch::after { transform: translateX(16px); }
            .toggle-label { font-size: 13px; color: #34495e; user-select: none; }
        `;
        document.head.appendChild(style);
    }, []);

    const handleGenerate = () => {
        const newBoard = generateValidBoard(constraints, desertPos);
        setBoard(newBoard);
        setGenerationFailed(newBoard.generationFailed || false);
        setIsEditMode(false);
    };

    const toggleConstraint = (key) => {
        setConstraints(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleHexClick = (clickedTile) => {
        if (!isEditMode) return;
        const currentIndex = RESOURCES_ARRAY.findIndex(r => r.id === clickedTile.resource.id);
        const nextResource = RESOURCES_ARRAY[(currentIndex + 1) % RESOURCES_ARRAY.length];
        const newBoard = board.map(t => {
            if (t.id === clickedTile.id) {
                let newNumber = t.number;
                if (nextResource.id === 'desert') newNumber = null;
                else if (t.resource.id === 'desert' && nextResource.id !== 'desert') newNumber = 2; // 简化处理
                return { ...t, resource: nextResource, number: newNumber };
            }
            return t;
        });
        setBoard(newBoard);
    };

    // 评估逻辑 (基于当前约束)
    const evaluateBoard = () => {
        if (board.length === 0) return null;
        const errors = [];
        const warnings = [];
        
        if (generationFailed) {
            errors.push("目前的约束条件过于苛刻，算法在 5000 次尝试后仍未能找到完美解。展示的是最后一次失败的地图。建议关闭部分约束。");
        }

        if (constraints.noAdjacent68 && !check68Rule(board)) errors.push("违反约束：红色高产点（6和8）相邻！");
        if (constraints.noAdjacentSameNumber && !checkSameNumberRule(board)) errors.push("违反约束：相同数字相邻！");
        if (constraints.noAdjacentSameResource && !checkSameResourceRule(board)) errors.push("违反约束：相同资源相邻！");
        if (constraints.noAdjacent2And12 && !check2And12Rule(board)) errors.push("违反约束：2和12相邻！");
        
        const resCounts = {};
        board.forEach(t => { resCounts[t.resource.id] = (resCounts[t.resource.id] || 0) + 1; });
        RESOURCES_ARRAY.forEach(res => {
            let count = resCounts[res.id] || 0;
            let standard = res.id === 'desert' ? 1 : (res.id === 'wood' || res.id === 'sheep' || res.id === 'wheat' ? 4 : 3);
            if (count !== standard) warnings.push(`${res.name} 的数量是 ${count} (标准应为 ${standard})`);
        });

        if (board.some(t => t.resource.id !== 'desert' && !t.number)) errors.push("有非沙漠地形缺少点数！");
        return { errors, warnings };
    };

    const evaluation = evaluateBoard();

    // 计算一个虚拟的假得分展示 (待实现真实算法)
    const mockScore = (evaluation && evaluation.errors.length === 0) ? (generationFailed ? 0 : 75) : '--';

    // --- 渲染三大块区 ---

    // 辅助渲染 Toggle 开关的函数
    const renderToggle = (key, label) => {
        const isOn = constraints[key];
        return e('div', { 
            key: key, 
            className: `toggle-container ${isOn ? 'toggle-on' : ''}`,
            onClick: () => toggleConstraint(key)
        }, [
            e('div', { key: 'switch', className: 'toggle-switch' }),
            e('div', { key: 'label', className: 'toggle-label' }, label)
        ]);
    };

    // 1. 左侧：设置栏
    const renderSidebarLeft = () => e('div', {className: 'sidebar-left'}, [
        e('div', {key: 't1', className: 'sidebar-title'}, 'SETTINGS / 设置'),
        e('div', {key: 'g1', className: 'control-group'}, [
            e('button', {key: 'btn1', className: 'primary', onClick: handleGenerate}, 'AI Generate (重新生成)'),
            e('button', {key: 'btn2', className: isEditMode ? 'active' : '', onClick: () => setIsEditMode(!isEditMode)}, isEditMode ? 'Exit Edit (完成编辑)' : 'Free Edit (自由编辑)')
        ]),
        e('div', {key: 't2', className: 'sidebar-title'}, 'CONSTRAINTS / 约束条件'),
        e('div', {key: 'g2', className: 'control-group'}, [
            renderToggle('noAdjacentSameNumber', 'No adjacent same number'),
            renderToggle('noAdjacentSameResource', 'No adjacent same resource'),
            renderToggle('noAdjacent68', 'No adjacent 6 and 8'),
            renderToggle('noAdjacent2And12', 'No adjacent 2 and 12')
        ]),
        
        e('div', {key: 't3', className: 'sidebar-title'}, 'DESERT POSITION / 沙漠位置'),
        e('div', {key: 'g3', className: 'segmented-control'}, [
            e('button', {
                key: 'center', 
                className: `segment-btn ${desertPos === 'center' ? 'active' : ''}`,
                onClick: () => setDesertPos('center')
            }, 'Center'),
            e('button', {
                key: 'edge', 
                className: `segment-btn ${desertPos === 'edge' ? 'active' : ''}`,
                onClick: () => setDesertPos('edge')
            }, 'Edge'),
            e('button', {
                key: 'random', 
                className: `segment-btn ${desertPos === 'random' ? 'active' : ''}`,
                onClick: () => setDesertPos('random')
            }, 'Random')
        ])
    ]);

    // 2. 中间：沙盘画布
    const renderMainCanvas = () => {
        const boardWidth = 600;
        const boardHeight = 600;
        return e('div', {className: 'main-canvas'}, 
            e('svg', {width: '100%', height: '100%', viewBox: `0 0 ${boardWidth} ${boardHeight}`}, [
                // 将六边形群组移动到正中心
                e('g', {key: 'hexes', transform: `translate(${boardWidth / 2}, ${boardHeight / 2})`}, 
                    board.map(tile => e(Hexagon, {
                        key: tile.id,
                        tile: tile,
                        size: HEX_SIZE,
                        onClick: handleHexClick,
                        isEditMode: isEditMode
                    }))
                )
            ])
        );
    };

    // 3. 右侧：分析面板
    const renderSidebarRight = () => {
        let evalContent = null;
        if (evaluation) {
            evalContent = e(React.Fragment, null, [
                (evaluation.errors.length === 0 && evaluation.warnings.length === 0) ? e('p', {key:'g', className: 'eval-good'}, '✔️ 完美平衡的地图配置') : null,
                evaluation.errors.length > 0 ? e('div', {key:'e'}, [
                    e('strong', {key:'t', className: 'eval-warning'}, '🚨 核心规则冲突：'),
                    e('ul', {key:'l', className:'eval-list'}, evaluation.errors.map((err, i) => e('li', {key: i, className: 'eval-warning'}, err)))
                ]) : null,
                evaluation.warnings.length > 0 ? e('div', {key:'w'}, [
                    e('strong', {key:'t', style:{fontSize:'13px'}}, '⚠️ 平衡性提示：'),
                    e('ul', {key:'l', className:'eval-list'}, evaluation.warnings.map((w, i) => e('li', {key: i}, w)))
                ]) : null
            ]);
        }

        return e('div', {className: 'sidebar-right'}, [
            e('div', {key: 't1', className: 'sidebar-title'}, 'ANALYSIS / 分析报告'),
            // 模仿截图的大分数板
            e('div', {key: 'score', className: 'score-display'}, [
                e('div', {key: 'num', className: 'score-number'}, mockScore),
                e('div', {key: 'lab', className: 'score-label'}, 'BALANCE SCORE')
            ]),
            // 我们之前的逻辑评估信息
            e('div', {key: 'eval', className: 'analysis-section'}, [
                e('h4', {key: 'h'}, 'RULE CHECK / 规则检测'),
                evalContent
            ]),
            // 雷达图预留位置
            e('div', {key: 'radar', className: 'analysis-section', style:{opacity: 0.4, textAlign:'center', marginTop:'30px'}}, [
                e('h4', {key: 'h'}, 'RESOURCE BALANCE'),
                e('div', {key: 'pic', style:{height:'150px', border:'1px dashed #ccc', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#999'}}, 'Radar Chart Area (待开发)')
            ])
        ]);
    };

    // 最终组装
    return e(React.Fragment, null, [
        e('div', {key: 'header', className: 'app-header'}, [
            e('h1', {key: 'h1'}, 'Generate Your Catan Board'),
            e('p', {key: 'p'}, 'Use our sandbox to create a perfectly balanced board, customize resources, and check rules.')
        ]),
        e('div', {key: 'main', className: 'app-main'}, [
            renderSidebarLeft(),
            renderMainCanvas(),
            renderSidebarRight()
        ])
    ]);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));