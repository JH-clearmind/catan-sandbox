const { useState, useEffect, createElement: e } = React;

// 1. 常量与配置
const HEX_SIZE = 60;

const RESOURCES = {
    WOOD: { id: 'wood', name: '森林', color: '#2E8B57' },
    BRICK: { id: 'brick', name: '丘陵', color: '#B22222' },
    SHEEP: { id: 'sheep', name: '牧场', color: '#90EE90' },
    WHEAT: { id: 'wheat', name: '麦田', color: '#FFD700' },
    ORE: { id: 'ore', name: '矿山', color: '#708090' },
    DESERT: { id: 'desert', name: '沙漠', color: '#F4A460' }
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

function generateValidBoard() {
    let valid = false;
    let boardMap = [];
    let attempts = 0;
    
    while (!valid && attempts < 1000) {
        let tiles = shuffle(STANDARD_TILES);
        let numbers = shuffle(STANDARD_NUMBERS);
        boardMap = [];
        let numIndex = 0;
        
        for (let i = 0; i < HEX_COORDS.length; i++) {
            const coord = HEX_COORDS[i];
            const resource = tiles[i];
            let number = null;
            if (resource.id !== 'desert') {
                number = numbers[numIndex];
                numIndex++;
            }
            boardMap.push({ ...coord, resource, number, id: i });
        }
        
        valid = check68Rule(boardMap);
        attempts++;
    }
    return boardMap;
}

function check68Rule(board) {
    const reds = board.filter(t => t.number === 6 || t.number === 8);
    for (let i = 0; i < reds.length; i++) {
        for (let j = i + 1; j < reds.length; j++) {
            if (hexDistance(reds[i], reds[j]) === 1) {
                return false;
            }
        }
    }
    return true;
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

// 3. UI 组件
const Hexagon = ({ tile, size, onClick, isEditMode }) => {
    const { x, y } = axialToPixel(tile.q, tile.r, size);
    
    const points = [];
    for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push(`${size * Math.cos(angle_rad)},${size * Math.sin(angle_rad)}`);
    }

    const isRed = tile.number === 6 || tile.number === 8;
    const textColor = isRed ? '#e74c3c' : '#2c3e50';

    const elements = [
        e('polygon', { 
            key: 'poly',
            points: points.join(' '), 
            fill: tile.resource.color, 
            stroke: '#fff', 
            strokeWidth: '3'
        })
    ];

    if (tile.number) {
        elements.push(
            e('g', { key: 'numGroup' }, [
                e('circle', { key: 'circle', cx: '0', cy: '0', r: size * 0.45, fill: '#fff', opacity: '0.9' }),
                e('text', { key: 'num', x: '0', y: '6', textAnchor: 'middle', fill: textColor, fontWeight: 'bold', fontSize: '22' }, tile.number),
                e('text', { key: 'dots', x: '0', y: '22', textAnchor: 'middle', fontSize: '12', fill: textColor, fontWeight: 'bold' }, '.'.repeat(getProbabilityDots(tile.number)))
            ])
        );
    }

    if (tile.resource.id === 'desert') {
        elements.push(
            e('text', { key: 'desertText', x: '0', y: '6', textAnchor: 'middle', fill: '#fff', fontSize: '18', fontWeight: 'bold' }, '沙漠')
        );
    }

    if (isEditMode) {
        elements.push(
            e('circle', { key: 'hover', cx: '0', cy: '0', r: size, fill: 'rgba(255,255,255,0.15)', className: 'hover-overlay', style: {opacity: 0} })
        );
    }

    return e('g', {
        transform: `translate(${x}, ${y})`,
        onClick: () => onClick(tile),
        style: { cursor: isEditMode ? 'pointer' : 'default', transition: 'transform 0.2s' },
        className: 'hexagon-group'
    }, elements);
};

const App = () => {
    const [board, setBoard] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        setBoard(generateValidBoard());
        const style = document.createElement('style');
        style.innerHTML = `
            .hexagon-group:hover .hover-overlay { opacity: 1 !important; }
            .hexagon-group:active { transform: scale(0.95); }
        `;
        document.head.appendChild(style);
    }, []);

    const handleGenerate = () => {
        setBoard(generateValidBoard());
        setIsEditMode(false);
    };

    const handleHexClick = (clickedTile) => {
        if (!isEditMode) return;
        
        const currentIndex = RESOURCES_ARRAY.findIndex(r => r.id === clickedTile.resource.id);
        const nextResource = RESOURCES_ARRAY[(currentIndex + 1) % RESOURCES_ARRAY.length];
        
        const newBoard = board.map(t => {
            if (t.id === clickedTile.id) {
                let newNumber = t.number;
                if (nextResource.id === 'desert') newNumber = null;
                else if (t.resource.id === 'desert' && nextResource.id !== 'desert') newNumber = 2;
                return { ...t, resource: nextResource, number: newNumber };
            }
            return t;
        });
        setBoard(newBoard);
    };

    const evaluateBoard = () => {
        if (board.length === 0) return null;
        
        const errors = [];
        const warnings = [];
        
        if (!check68Rule(board)) {
            errors.push("红色高产点（6和8）相邻了！这在标准规则中是不允许的。");
        }
        
        const resCounts = {};
        board.forEach(t => {
            resCounts[t.resource.id] = (resCounts[t.resource.id] || 0) + 1;
        });
        
        RESOURCES_ARRAY.forEach(res => {
            let count = resCounts[res.id] || 0;
            let standard = res.id === 'desert' ? 1 : (res.id === 'wood' || res.id === 'sheep' || res.id === 'wheat' ? 4 : 3);
            if (count !== standard) {
                warnings.push(`${res.name} 的数量是 ${count} (标准版应为 ${standard})`);
            }
        });

        const missingNumbers = board.filter(t => t.resource.id !== 'desert' && !t.number);
        if (missingNumbers.length > 0) {
            errors.push("有非沙漠地形缺少点数指示物！");
        }

        return { errors, warnings };
    };

    const evaluation = evaluateBoard();
    const boardWidth = 700;
    const boardHeight = 650;

    const evalContent = !evaluation ? e('p', null, '正在生成中...') : e(React.Fragment, null, [
        (evaluation.errors.length === 0 && evaluation.warnings.length === 0) ? e('p', {key:'good', className: 'eval-good'}, '✔️ 当前地图完全符合标准版规则，非常完美！') : null,
        evaluation.errors.length > 0 ? e('div', {key:'errors'}, [
            e('strong', {key:'title', className: 'eval-warning'}, '🚨 严重问题：'),
            e('ul', {key:'list'}, evaluation.errors.map((err, i) => e('li', {key: i, className: 'eval-warning'}, err)))
        ]) : null,
        evaluation.warnings.length > 0 ? e('div', {key:'warnings'}, [
            e('strong', {key:'title'}, '⚠️ 警告（不符合标准配置，但可以自定义玩）：'),
            e('ul', {key:'list'}, evaluation.warnings.map((w, i) => e('li', {key: i}, w)))
        ]) : null
    ]);

    return e('div', { className: 'app-container' }, [
        e('h1', {key: 'title'}, '🏝️ 卡坦岛地图沙盘'),
        e('div', {key: 'controls', className: 'controls'}, [
            e('button', {key: 'btnGen', onClick: handleGenerate}, '🎲 自动生成标准地图'),
            e('button', {
                key: 'btnEdit',
                className: isEditMode ? 'active' : '',
                onClick: () => setIsEditMode(!isEditMode)
            }, isEditMode ? '✅ 退出编辑模式' : '✏️ 开启自由编辑 (点击地块)')
        ]),
        e('div', {key: 'board', className: 'board-container'}, 
            e('svg', {width: boardWidth, height: boardHeight, style: {backgroundColor: '#74b9ff'}}, [
                e('rect', {key: 'bg', width: '100%', height: '100%', fill: '#a29bfe', opacity: '0.3'}),
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
        ),
        e('div', {key: 'eval', className: 'eval-panel'}, [
            e('h3', {key: 'title'}, '🔍 沙盘评估报告'),
            evalContent
        ])
    ]);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App));