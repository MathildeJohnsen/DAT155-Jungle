import * as THREE from 'three';

export class CollisionManager {

constructor(scene) {
    this.colliders = [];
    this.playerRadius = 0.4;
    this.scene = scene;
    this.showDebug = false;
}


addCircle(x, z, radius, y = 0) {
    this.colliders.push({
        type: 'circle',
        x,
        z,
        radius
    });

    if (this.showDebug) {
        const geometry = new THREE.RingGeometry(
            radius + this.playerRadius - 0.04,
            radius + this.playerRadius,
            48
        );

        const material = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            side: THREE.DoubleSide,
            depthTest: false
        });

        const circle = new THREE.Mesh(geometry, material);
        circle.rotation.x = -Math.PI / 2;
        circle.position.set(x, y + 0.15, z);
        circle.renderOrder = 999;

        this.scene.add(circle);
    
}
}

addBox(minX, maxX, minZ, maxZ) {
    this.colliders.push({
        type: 'box',
        minX,
        maxX,
        minZ,
        maxZ
    });
}

checkCollision(x, z) {
    for (const collider of this.colliders) {
        if (collider.type === 'box') {
            const closestX = Math.max(
                collider.minX,
                Math.min(x, collider.maxX)
            );

            const closestZ = Math.max(
                collider.minZ,
                Math.min(z, collider.maxZ)
            );

            const dx = x - closestX;
            const dz = z - closestZ;

            if (
                dx * dx + dz * dz <
                this.playerRadius * this.playerRadius
            ) {
                return true;
            }
        } else {
            const dx = x - collider.x;
            const dz = z - collider.z;

            const minDistance =
                this.playerRadius + collider.radius;

            if (
                dx * dx + dz * dz <
                minDistance * minDistance
            ) {
                return true;
            }
        }
    }

    return false;
}

canMove(fromX, fromZ, toX, toZ) {
    for (const collider of this.colliders) {

        if (collider.type === 'circle') {
            const oldDx = fromX - collider.x;
            const oldDz = fromZ - collider.z;

            const newDx = toX - collider.x;
            const newDz = toZ - collider.z;

            const oldDistance = Math.hypot(oldDx, oldDz);
            const newDistance = Math.hypot(newDx, newDz);

            const minDistance =
                this.playerRadius + collider.radius;

            // Hvis vi allerede er innenfor området,
            // tillat bevegelse utover.
            if (oldDistance < minDistance) {
                if (newDistance < oldDistance - 0.00001) {
                    return false;
                }
            } else if (newDistance < minDistance) {
                return false;
            }

        } else if (collider.type === 'box') {
            if (this.checkCollision(toX, toZ)) {
                return false;
            }
        }
    }

    return true;
}

}
