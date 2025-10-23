import { cp } from 'fs/promises'
import * as Path from 'path'

async function Render2Server() {
    const source = Path.join(__dirname, '..', 'Verteilen', 'build', 'renderer')
    const target = Path.join(__dirname, '..', 'dist', 'public')
    return cp(source, target, { recursive: true })
}

async function main() {
    await Render2Server()
}

if (require.main === module) {
    main();
}