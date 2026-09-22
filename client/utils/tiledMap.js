// Utilitários para ler mapas do Tiled (JSON) exportados com camada de imagem
// (`fundo`) + camadas de objetos (`objetos` para sprites, `colisao` para bloqueio).
// Compartilhado entre BaseRoomScene e cenas avulsas (ex: IntroScene).

// URLs de todos os props do jogo (assets/images/<sala>/props/*.png), carregados
// como `prop-<nome do arquivo>`. Nomes de arquivo devem ser únicos entre salas.
const PROP_FILES = import.meta.glob("../assets/images/*/props/*.png", {
    eager: true,
    query: "?url",
    import: "default"
});

// Registra todos os props no loader da cena (chamar no preload).
export function preloadProps(scene) {
    Object.entries(PROP_FILES).forEach(([path, url]) => {
        const name = path.split("/").pop().replace(/\.png$/i, "");
        if (!scene.textures.exists(`prop-${name}`)) {
            scene.load.image(`prop-${name}`, url);
        }
    });
}

function findObjectLayer(mapData, layerName) {
    const layer = mapData.layers?.find(
        (candidate) => candidate.type === "objectgroup" && candidate.name === layerName
    );

    if (!layer) {
        console.warn(`Camada de objetos "${layerName}" não encontrada no mapa Tiled.`);
        return null;
    }

    return layer;
}

// Mapeia gid -> nome do prop (basename do PNG do tileset, sem extensão).
function buildGidMap(mapData) {
    const map = {};
    (mapData.tilesets ?? []).forEach((tileset) => {
        (tileset.tiles ?? []).forEach((tile) => {
            const file = tile.image.split("/").pop().replace(/\.png$/i, "");
            map[tileset.firstgid + tile.id] = file;
        });
    });
    return map;
}

// Nomes dos props (chaves `prop-<nome>`) referenciados pelo tileset — usado no
// preload para carregar só os PNGs necessários.
export function tiledPropNames(mapData) {
    return Object.values(buildGidMap(mapData));
}

// Retângulos de colisão { x, y, w, h } (canto sup. esquerdo, já com offset).
export function tiledColliders(mapData, layerName, offset = { x: 0, y: 0 }) {
    const layer = findObjectLayer(mapData, layerName);
    if (!layer) {
        return [];
    }

    return layer.objects.map((object) => ({
        x: object.x + offset.x,
        y: object.y + offset.y,
        w: object.width,
        h: object.height
    }));
}

// Instancia os tile objects como sprites (origem no canto inferior esquerdo,
// padrão do Tiled) com profundidade por y (y-sort). Retorna as imagens criadas,
// cada uma com `propName` (o nome do prop).
export function placeTiledObjects(scene, mapData, layerName, offset = { x: 0, y: 0 }) {
    const layer = findObjectLayer(mapData, layerName);
    if (!layer) {
        return [];
    }

    const gidToKey = buildGidMap(mapData);
    const images = [];

    layer.objects.forEach((object) => {
        const name = gidToKey[object.gid];
        const textureKey = `prop-${name}`;

        if (!name || !scene.textures.exists(textureKey)) {
            console.warn(`Prop não encontrado para o objeto Tiled gid=${object.gid}.`);
            return;
        }

        const x = object.x + offset.x;
        const y = object.y + offset.y;
        const image = scene.add.image(x, y, textureKey).setOrigin(0, 1).setDepth(y);
        image.propName = name;   // o BaseRoomScene usa para achar a descrição do "examinar".
        images.push(image);
    });

    return images;
}
