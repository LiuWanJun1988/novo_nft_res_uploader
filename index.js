const fs = require("fs");
var path = require("path");
require("dotenv").config();

const { createCanvas, loadImage } = require("canvas");
const {
    width,
    height,
    baseImageUri,
    races
} = require("./tokyo_clan_input/config.js");
const console = require("console");
const { env } = require("process");
const canvas = createCanvas(width, height);
const ctx = canvas.getContext("2d");
var dnaList = [];

const createDistribution = (array, weights, size) => {
    const distribution = [];
    const sum = weights.reduce((a, b) => a + b);
    const quant = size / sum;
    for (let i = 0; i < array.length; ++i) {
        const limit = quant * weights[i];
        for (let j = 0; j < limit; ++j) {
            distribution.push(i);
        }
    }

    return distribution;
};

const randomIndex = (distribution) => {
    const index = Math.floor(distribution.length * Math.random()); // random index
    return distribution[index];
};

const chooseImageElement = (dir) => {
    const files = fs.readdirSync(process.env.INPUT_DIR_PATH + dir);
    const filePaths = [];
    const weights = [];
    const res = [];
    for (var i = 0; i < files.length; i++) {
        weights.push(parseInt(files[i].replace(path.extname(files[i]), "").split("#")[1]));
        filePaths.push(process.env.INPUT_DIR_PATH + dir + "/" + files[i]);
    }
    const distribution = createDistribution(filePaths, weights, process.env.TOTAL_PROB); // 10 - describes distribution array size (it affects on precision)

    for (let i = 0; i < process.env.MAX_NUM_IMAGES; ++i) {
        const index = randomIndex(distribution);
        res.push(filePaths[index]);
    }

    return res;
}

const saveImage = (_imageName) => {
    fs.writeFileSync(
        `./output/images/${_imageName}.png`,
        canvas.toBuffer("image/png")
    );
};

const signImage = (_sig) => {
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30pt Verdana";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(_sig, 40, 40);
};

const saveMetadata = (_dna, _metadataName) => {
    let tempMetadata = {
        image: `${baseImageUri}/${_metadataName}.png`,
        traits: {
            background: _dna[0],
            weapon: _dna[1],
            body: _dna[2],
            outfit: _dna[3],
            head: _dna[4],
            ears: _dna[5],
            mouth: _dna[6],
            nose: _dna[7],
            eyes: _dna[8],
            eyebrows: _dna[9],
            hair: _dna[10],
            facialhair: _dna[11],
            eyewear: _dna[12]
        }
    };

    fs.writeFileSync(
        `./output/jsons/${_metadataName}.json`,
        JSON.stringify(tempMetadata)
    );
};

const loadLayerImg = async(_layer) => {
    return new Promise(async(resolve) => {
        const image = await loadImage(`${_layer.selectedElement.path}`);
        resolve({ layer: _layer, loadedImage: image });
    });
};

const drawElement = (_element) => {
    ctx.drawImage(
        _element.loadedImage,
        _element.layer.position.x,
        _element.layer.position.y,
        _element.layer.size.width,
        _element.layer.size.height
    );
};

const constructLayerToDna = (_dna = [], _races = [], _race) => {
    let mappedDnaToLayers = _races[_race].layers.map((layer, index) => {
        let selectedElement = layer.elements.find((e) => e.id == _dna[index]);
        return {
            name: layer.name,
            position: layer.position,
            size: layer.size,
            selectedElement: selectedElement,
        };
    });

    return mappedDnaToLayers;
};

const isDnaUnique = (_DnaList = [], _dna = []) => {
    let foundDna = _DnaList.find((i) => i.join("") === _dna.join(""));
    return foundDna == undefined ? true : false;
};

const combos = (list, n = 0, result = [], current = []) => {
    if (n === list.length || result.length >= process.env.MAX_NUM_IMAGES) result.push(current)
    else list[n].forEach(item => combos(list, n + 1, result, [...current, item]))

    return result
}

const createAllDna = (_races, _race) => {
    let id_2d_list = [];
    let id_list = [];
    _races[_race].layers.forEach((layer) => {
        id_list = [];
        layer.elements.forEach((element) => {
            id_list.push(element.id);
        });
        id_2d_list.push(id_list);
    });

    return combos(id_2d_list);
}

const startCreating = async() => {

    let background_res = chooseImageElement("01_Backgrounds");
    let weapon_res = chooseImageElement("02_Weapons");
    let body_res = chooseImageElement("03_Body");
    let outfit_res = chooseImageElement("04_Outfits");
    let head_res = chooseImageElement("05_Head");
    let mouth_res = chooseImageElement("06_Mouths");
    let eye_res = chooseImageElement("07_Eyes");
    let nose_res = chooseImageElement("08_Noses");
    let haircut_res = chooseImageElement("09_Haircut");
    let eyebrows_res = chooseImageElement("10_Eyebrows");
    let eyewear_res = chooseImageElement("11_Eyewear");
    let facialhair_res = chooseImageElement("12_Facialhair");
    let ears_res = chooseImageElement("13_Ears");
    let loadedElements = [];
    for (var i = 0; i < process.env.MAX_NUM_IMAGES; i++) {
        loadedElements = [];

    }

    console.log(ears_res);

    let race = "NovoStakingV2";
    let all_dna = createAllDna(races, race);

    let newDna = [];
    var name = "";
    let results;


    for (let i = 0; i < all_dna.length; i++) {
        newDna = all_dna[i];
        if (isDnaUnique(dnaList, newDna)) {
            results = constructLayerToDna(newDna, races, race);
            loadedElements = [];
            results.forEach((layer) => {
                loadedElements.push(loadLayerImg(layer));
            });

            name = Buffer.from(newDna).toString('base64')
            await Promise.all(loadedElements).then((elementArray) => {
                ctx.clearRect(0, 0, width, height);
                elementArray.forEach((element) => {
                    drawElement(element);
                });
                signImage(`#${i + 1}`);
                saveImage(name);
                saveMetadata(newDna, name);

                console.log(
                    `Created image: ${i + 1}, Name: ${name} with traits: ${newDna}`
                );
            });
            dnaList.push(newDna);
        } else {
            console.log("DNA exists!");
        }
    }

    return;
};

startCreating();