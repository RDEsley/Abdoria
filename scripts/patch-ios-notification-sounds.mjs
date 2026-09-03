import fs from 'node:fs';
import path from 'node:path';

const pbxPath = path.join('ios/App/App.xcodeproj/project.pbxproj');
let src = fs.readFileSync(pbxPath, 'utf8');
if (src.includes('evolyn_classico.wav')) {
  console.log('Xcode já inclui os sons de notificação.');
  process.exit(0);
}

const files = fs
  .readdirSync('ios/App/App/NotificationSounds')
  .filter((file) => file.endsWith('.wav'));

const buildFiles = [];
const fileRefs = [];
const groupKids = [];
const resourceKids = [];

files.forEach((file, index) => {
  const n = String(index + 1).padStart(2, '0');
  const buildId = `E5NS${n}B1F11E501F11E50F11`;
  const refId = `E5NS${n}F1F11E501F11E50F11`;
  buildFiles.push(
    `\t\t${buildId} /* ${file} in Resources */ = {isa = PBXBuildFile; fileRef = ${refId} /* ${file} */; };`,
  );
  fileRefs.push(
    `\t\t${refId} /* ${file} */ = {isa = PBXFileReference; lastKnownFileType = audio.wav; name = ${file}; path = NotificationSounds/${file}; sourceTree = "<group>"; };`,
  );
  groupKids.push(`\t\t\t\t${refId} /* ${file} */,`);
  resourceKids.push(`\t\t\t\t${buildId} /* ${file} in Resources */,`);
});

src = src.replace(
  '/* End PBXBuildFile section */',
  `${buildFiles.join('\n')}\n/* End PBXBuildFile section */`,
);
src = src.replace(
  '/* End PBXFileReference section */',
  `${fileRefs.join('\n')}\n/* End PBXFileReference section */`,
);
src = src.replace(
  '\t\t\t\t50B271D01FEDC1A000F3C39B /* public */,\n',
  `${groupKids.join('\n')}\n\t\t\t\t50B271D01FEDC1A000F3C39B /* public */,\n`,
);
src = src.replace(
  '\t\t\t\t2FAD9763203C412B000D30F8 /* config.xml in Resources */,\n',
  `${resourceKids.join('\n')}\n\t\t\t\t2FAD9763203C412B000D30F8 /* config.xml in Resources */,\n`,
);

fs.writeFileSync(pbxPath, src);
console.log(`Adicionados ${files.length} sons ao Xcode.`);
