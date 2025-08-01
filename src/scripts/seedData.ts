import mongoose from 'mongoose';
import User from '../models/User';
import Dentist from '../models/Dentist';
import Patient from '../models/Patient';
import Service from '../models/Service';
import { config } from '../config/config';

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ MongoDB connected for seeding');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log('👤 Admin user already exists');
      return;
    }

    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@dentalcare.com',
      password: 'Admin123!',
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: Admin123!`);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
};

const seedDentists = async () => {
  try {
    const existingDentists = await Dentist.countDocuments();
    if (existingDentists > 0) {
      console.log('🦷 Dentists already exist in database');
      return;
    }

    const dentistUsers = await User.find({ role: 'dentist' });
    if (dentistUsers.length === 0) {
      console.log('❌ No dentist users found. Please seed users first.');
      return;
    }

    const dentistsData = [
      {
        userId: dentistUsers[0]._id,
        licenseNumber: 'DDS-CA-001',
        specialization: ['General Dentistry', 'Cosmetic Dentistry'],
        experience: 12,
        education: [
          {
            degree: 'Doctor of Dental Surgery (DDS)',
            university: 'UCLA School of Dentistry',
            year: 2012
          }
        ],
        bio: 'Johnson is a dedicated dentist with over 12 years of experience in general and cosmetic dentistry.',
        consultationFee: 150,
        rating: 4.8,
        totalReviews: 234
      },
      {
        userId: dentistUsers[1]._id,
        licenseNumber: 'DDS-CA-002',
        specialization: ['Orthodontics', 'Pediatric Dentistry'],
        experience: 8,
        education: [
          {
            degree: 'Doctor of Dental Surgery (DDS)',
            university: 'USC School of Dentistry',
            year: 2016
          }
        ],
        bio: 'Chen specializes in orthodontics and pediatric dentistry, helping children and adults achieve perfect smiles.',
        consultationFee: 175,
        rating: 4.9,
        totalReviews: 189
      },
      {
        userId: dentistUsers[2]._id,
        licenseNumber: 'DDS-CA-003',
        specialization: ['Oral Surgery', 'Implantology'],
        experience: 15,
        education: [
          {
            degree: 'Doctor of Dental Surgery (DDS)',
            university: 'UCSF School of Dentistry',
            year: 2009
          }
        ],
        bio: 'Rodriguez is an experienced oral surgeon with expertise in complex extractions and dental implants.',
        consultationFee: 200,
        rating: 4.7,
        totalReviews: 156
      },
      {
        userId: dentistUsers[3]._id,
        licenseNumber: 'DDS-CA-004',
        specialization: ['Endodontics', 'General Dentistry'],
        experience: 10,
        education: [
          {
            degree: 'Doctor of Dental Surgery (DDS)',
            university: 'Loma Linda University School of Dentistry',
            year: 2014
          }
        ],
        bio: 'Thompson is an endodontic specialist focused on root canal therapy and saving natural teeth.',
        consultationFee: 180,
        rating: 4.6,
        totalReviews: 203
      },
      {
        userId: dentistUsers[4]._id,
        licenseNumber: 'DDS-CA-005',
        specialization: ['Periodontics', 'General Dentistry'],
        experience: 14,
        education: [
          {
            degree: 'Doctor of Dental Surgery (DDS)',
            university: 'UCLA School of Dentistry',
            year: 2010
          }
        ],
        bio: 'Williams is a periodontal specialist dedicated to treating gum disease and maintaining optimal oral health.',
        consultationFee: 160,
        rating: 4.8,
        totalReviews: 178
      }
    ];

    const createdDentists = await Dentist.insertMany(dentistsData);
    console.log(`✅ ${createdDentists.length} dentists created successfully`);
    
    createdDentists.forEach((dentist, index) => {
      console.log(`   ${index + 1}. ${dentistUsers[index].name} - ${dentist.specialization.join(', ')}`);
    });
  } catch (error) {
    console.error('❌ Error creating dentists:', error);
  }
};



const seedDentistUsers = async () => {
  try {
    const existingDentistUsers = await User.countDocuments({ role: 'dentist' });
    if (existingDentistUsers > 0) {
      console.log('👨‍⚕️ Dentist users already exist');
      return;
    }

    const dentistUsersData = [
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@dentalcare.com',
        password: 'Dentist123!',
        role: 'dentist',
        isActive: true
      },
      {
        name: 'Michael Chen',
        email: 'michael.chen@dentalcare.com',
        password: 'Dentist123!',
        role: 'dentist',
        isActive: true
      },
      {
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@dentalcare.com',
        password: 'Dentist123!',
        role: 'dentist',
        isActive: true
      },
      {
        name: 'Robert Thompson',
        email: 'robert.thompson@dentalcare.com',
        password: 'Dentist123!',
        role: 'dentist',
        isActive: true
      },
      {
        name: 'Lisa Williams',
        email: 'lisa.williams@dentalcare.com',
        password: 'Dentist123!',
        role: 'dentist',
        isActive: true
      }
    ];

    const createdDentistUsers = [];
    for (const userData of dentistUsersData) {
      const user = new User(userData);
      await user.save();
      createdDentistUsers.push(user);
    }
    console.log(`✅ ${createdDentistUsers.length} dentist users created successfully`);
    
    createdDentistUsers.forEach((dentistUser, index) => {
      console.log(`   ${index + 1}. ${dentistUser.name} (${dentistUser.email})`);
    });
  } catch (error) {
    console.error('❌ Error creating dentist users:', error);
  }
};

const clearExistingData = async () => {
  try {
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({ role: { $in: ['admin', 'dentist'] } });
    await Dentist.deleteMany({});
    await Patient.deleteMany({});
    await Service.deleteMany({});
    console.log('✅ Existing data cleared');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
};

const seedDatabase = async () => {
  console.log('🌱 Starting database seeding...');
  
  await connectDB();
  
  const args = process.argv.slice(2);
  if (args.includes('--clear')) {
    await clearExistingData();
  }
  
  await seedAdminUser();
  await seedDentistUsers();
  await seedDentists();
  
  console.log('🎉 Database seeding completed!');
  console.log('\n📋 Summary:');
  console.log('   - Admin user: admin@dentalcare.com (password: Admin123!)');
  console.log('   - Dentist users: 5 users with dentist role (password: Dentist123!)');
  console.log('   - Dentist profiles: 5 specialists with different specializations');
  console.log('\n💡 Tip: Use --clear flag to remove existing data before seeding');
  
  await mongoose.disconnect();
  console.log('🔌 Database connection closed');
};


if (require.main === module) {
  seedDatabase().catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });
}

export { seedDatabase, seedAdminUser, seedDentists };